import React, { useRef, useState } from 'react';
import './App.css';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import axios from 'axios';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB5hA8bZiXxDao_2R4XR_MKVfj8gNRIs6s",
  authDomain: "chat-4ff4c.firebaseapp.com",
  projectId: "chat-4ff4c",
  storageBucket: "chat-4ff4c.appspot.com",
  messagingSenderId: "447302816392",
  appId: "1:447302816392:web:01a1acc4c557be9223c53d",
  measurementId: "G-1TK3PTMM9D"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const firestore = firebase.firestore();

const FLASK_SERVER_URL = 'http://127.0.0.1:5000';

async function getAIResponse(message) {
  try {
    const response = await axios.post(`${FLASK_SERVER_URL}/chat`, { message });
    return response.data.response;
  } catch (error) {
    console.error("Error fetching AI response:", error);
    return "Sorry, there was an error.";
  }
}

async function analyzeDocument(content) {
  try {
    const response = await axios.post(`${FLASK_SERVER_URL}/analyze-document`, { content });
    return response.data.summary;
  } catch (error) {
    console.error("Error summarizing document:", error);
    return "Sorry, there was an error summarizing the document.";
  }
}

function App() {
  const [user] = useAuthState(auth);

  return (
    <div className="App">
      <header>
        <h1>⚛️ Artorias Chat</h1>
        <SignOut />
      </header>

      <section>
        {user ? <ChatRoom /> : <SignIn />}
      </section>
    </div>
  );
}

function SignIn() {
  const signInWithGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
  };

  return (
    <>
      <button className="sign-in" onClick={signInWithGoogle}>Sign in with Google</button>
      <p>Do not violate the community guidelines or you will be banned for life!</p>
    </>
  );
}

function SignOut() {
  return auth.currentUser && (
    <button className="sign-out" onClick={() => auth.signOut()}>Sign Out</button>
  );
}

function ChatRoom() {
  const dummy = useRef();
  const messagesRef = firestore.collection('messages');
  const query = messagesRef.orderBy('createdAt').limit(25);

  const [messages] = useCollectionData(query, { idField: 'id' });
  const [formValue, setFormValue] = useState('');
  const [documentContent, setDocumentContent] = useState('');

  const sendMessage = async (e) => {
    e.preventDefault();

    const { uid, photoURL } = auth.currentUser;

    await messagesRef.add({
      text: formValue,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      uid,
      photoURL
    });

    if (formValue.startsWith('@artorias')) {
      const response = await getAIResponse(formValue);
      await messagesRef.add({
        text: response,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        uid: 'artorias',
        photoURL: 'https://steamuserimages-a.akamaihd.net/ugc/82596531523449021/3FC0CB7008CEB3C51A0D75641DA615591A4C2203/?imw=5000&imh=5000&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false'
      });
    }

    setFormValue('');
    dummy.current.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDocumentUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target.result;
        setDocumentContent(content);
        const summary = await analyzeDocument(content);
        await messagesRef.add({
          text: `Document Summary:\n\n${summary}`,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          uid: 'artorias',
          photoURL: 'https://steamuserimages-a.akamaihd.net/ugc/82596531523449021/3FC0CB7008CEB3C51A0D75641DA615591A4C2203/?imw=5000&imh=5000&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false'
        });
      };
      reader.readAsText(file);
    }
  };

  return (
    <>
      <main>
        {messages && messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <span ref={dummy}></span>
      </main>

      <div className="input-area">
        <form onSubmit={sendMessage}>
          <input
            value={formValue}
            onChange={(e) => setFormValue(e.target.value)}
            placeholder="Say something nice"
          />
          <button type="submit" disabled={!formValue}>Send</button>
        </form>
        <div className="file-upload">
          <label htmlFor="file-upload" className="custom-file-upload">
            Upload
          </label>
          <input id="file-upload" type="file" onChange={handleDocumentUpload} />
        </div>
      </div>
    </>
  );
}

function ChatMessage(props) {
  const { text, uid, photoURL } = props.message;
  const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';

  return (
    <div className={`message ${messageClass}`}>
      <img src={photoURL || 'https://steamuserimages-a.akamaihd.net/ugc/82596531523449021/3FC0CB7008CEB3C51A0D75641DA615591A4C2203/?imw=5000&imh=5000&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false'} alt="User avatar" />
      <p>{text}</p>
    </div>
  );
}

export default App;