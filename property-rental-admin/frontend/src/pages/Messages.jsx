import { useEffect, useState } from 'react';
import API from '../api';
import Pagination from '../components/Pagination';
import { formatDate, parsePaged } from '../utils';

export default function Messages() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });

  const load = async (nextPage = 1) => {
    const res = await API.get('/messages', { params: { page: nextPage, limit: 50 } });
    const parsed = parsePaged(res.data);
    setRows(parsed.items);
    setMeta(parsed.meta);
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header"><div><h1>Messages</h1><p className="page-subtitle">Monitor communication and detect abuse patterns.</p></div></div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Sender</th><th>Receiver</th><th>Message</th><th>Read</th><th>Time</th></tr></thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m._id}>
                <td>{m.sender?.email || '-'}</td>
                <td>{m.receiver?.email || '-'}</td>
                <td>{m.text || m.content || '-'}</td>
                <td>{m.isRead ? 'Yes' : 'No'}</td>
                <td>{formatDate(m.createdAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="5">No messages found.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination meta={meta} onPageChange={load} />
    </div>
  );
}
