import Message from '../models/Message.js';
import User from '../models/User.js';

export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: req.params.recipientId },
        { sender: req.params.recipientId, recipient: req.user._id },
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

  try {
    const message = new Message({
      sender: req.user._id,
      recipient: recipientId,
      content,
    });

    await message.save();

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};
