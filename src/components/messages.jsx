import React, { useEffect, useState } from 'react';
import Footer from '../components/footer'; // Optional footer component
import '../assets/styles.css';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadMessages();
  }, [filter]);

  const loadMessages = async () => {
    const messagesList = document.getElementById("messages-list");
    messagesList.innerHTML = "<p>Loading messages...</p>";

    const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    
    const loadedMessages = [];
    querySnapshot.forEach(doc => {
      const message = doc.data();
      loadedMessages.push({ id: doc.id, ...message });
    });
    
    setMessages(loadedMessages);
  };

  const viewMessage = (message) => {
    setSelectedMessage(message);
  };

  const closeMessage = () => {
    setSelectedMessage(null);
    setReplyText('');
  };

  const sendReply = async () => {
    if (replyText.trim() === "") {
      alert("Please enter a reply.");
      return;
    }

    try {
      await updateDoc(doc(db, "messages", selectedMessage.id), {
        reply: replyText,
        repliedAt: Timestamp.fromDate(new Date())
      });
      alert("Reply sent!");
      closeMessage();
      loadMessages();
    } catch (error) {
      console.error("Error sending reply:", error);
    }
  };

  const filterMessages = (type) => {
    setFilter(type);
    // You can add more specific filtering logic here if needed
  };

  return (
    <div className="messages-page-wrapper">
    
      
      <section className="messages">
        <h1>Inbox</h1>

        {/* Message Filters */}
        <div className="filters">
          <button onClick={() => filterMessages('all')}>All</button>
          <button onClick={() => filterMessages('unread')}>Unread</button>
          <button onClick={() => filterMessages('customer')}>Customer Inquiries</button>
          <button onClick={() => filterMessages('alerts')}>System Alerts</button>
        </div>

        {/* Messages List */}
        <div id="messages-list">
          {messages.length === 0 ? (
            <p>No messages found.</p>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="message-item">
                <p><strong>{message.sender}</strong>: {message.text.substring(0, 50)}...</p>
                <small>{new Date(message.timestamp.seconds * 1000).toLocaleString()}</small>
                <button onClick={() => viewMessage(message)}>View</button>
              </div>
            ))
          )}
        </div>

        {/* Message View */}
        {selectedMessage && (
          <div id="message-view" className="message-view">
            <h3>Message from <span>{selectedMessage.sender}</span></h3>
            <p>{selectedMessage.text}</p>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your response..."
            ></textarea>
            <button onClick={sendReply}>Send Reply</button>
            <button onClick={closeMessage}>Close</button>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default Messages;
