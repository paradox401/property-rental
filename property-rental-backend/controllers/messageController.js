import Message from '../models/Message.js';
import User from '../models/User.js';
import { sendNotification } from '../socket.js';
import { canUsersChat } from '../utils/chatAccess.js';

export const getConversationSummaries = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const summaries = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: currentUserId }, { recipient: currentUserId }],
        },
      },
      {
        $addFields: {
          otherUserId: {
            $cond: [{ $eq: ['$sender', currentUserId] }, '$recipient', '$sender'],
          },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$otherUserId',
          lastMessage: { $first: '$content' },
          lastMessageAt: { $first: '$createdAt' },
          lastSender: { $first: '$sender' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$recipient', currentUserId] }, { $eq: ['$read', false] }],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastMessageAt: -1 } },
    ]);

    const userIds = summaries.map((item) => item._id);
    const users = await User.find({ _id: { $in: userIds } }).select('_id name email').lean();
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));

    res.json(
      summaries
        .map((item) => ({
          user: userMap.get(item._id.toString()) || null,
          lastMessage: item.lastMessage,
          lastMessageAt: item.lastMessageAt,
          lastSender: item.lastSender,
          unreadCount: item.unreadCount || 0,
        }))
        .filter((item) => Boolean(item.user))
    );
  } catch (error) {
    console.error('Error fetching conversation summaries:', error);
    res.status(500).json({ error: 'Failed to fetch conversation summaries' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const allowed = await canUsersChat(req.user._id, recipientId);
    if (!allowed) {
      return res.status(403).json({ error: 'Not authorized to access this conversation' });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: recipientId },
        { sender: recipientId, recipient: req.user._id },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const sendMessage = async (req, res) => {
  const { recipientId, content } = req.body;
  if (!recipientId || !content?.trim()) {
    return res.status(400).json({ error: 'Recipient and message content are required' });
  }

  try {
    const allowed = await canUsersChat(req.user._id, recipientId);
    if (!allowed) {
      return res.status(403).json({ error: 'Not authorized to message this user' });
    }

    const message = new Message({
      sender: req.user._id,
      recipient: recipientId,
      content,
    });

    await message.save();

    await sendNotification(
      recipientId,
      'message',
      `New message from ${req.user.name || 'User'}`,
      `/renter/message`
    );

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const markConversationRead = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const allowed = await canUsersChat(req.user._id, recipientId);
    if (!allowed) {
      return res.status(403).json({ error: 'Not authorized to update this conversation' });
    }

    await Message.updateMany(
      { sender: recipientId, recipient: req.user._id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};
