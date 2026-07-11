/* @Author - Ram-Ambati 
   @ This file is the entry point of the application where it renders app components from App.jsx.
*/

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { injectSpeedInsights } from '@vercel/speed-insights'
import './index.css'
import App from './App.jsx'

injectSpeedInsights() // This is from Vercel to track the speed of the website.

createRoot(document.getElementById('root')).render(
  //Strict mode is used to detect potential problems in the application. It is not required for the application to run.
  <StrictMode>
    <App /> 
  </StrictMode>,
)
