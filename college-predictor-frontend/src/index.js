import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/*
 If you previously had an import for './index.css' but no such file exists, either:
   - remove the import, or
   - create an empty index.css

Below, I’m omitting any CSS import for simplicity.
*/

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

