import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// dark theme background
const style = document.createElement('style');
style.innerHTML = `
  html, body, #root { height: 100%; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #1a1a1aff;   
    color: #ffffff;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  }
  a { color: inherit; text-decoration: none; }
  button { color: inherit; }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
