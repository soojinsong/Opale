import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import { Provider } from 'react-redux'
import store from './store'

import AppInitializer from "./AppInitializer";

const isNetlifyPreview = window.location.hostname.includes("dev--")

ReactDOM.createRoot(document.getElementById('root')).render(
  isNetlifyPreview ? (
    <Provider store={store}>
      <AppInitializer>
        <App />
      </AppInitializer>
    </Provider>
  ) : (
    <React.StrictMode>
      <Provider store={store}>
        <AppInitializer>
          <App />
        </AppInitializer>
      </Provider>
    </React.StrictMode>
  )
)
