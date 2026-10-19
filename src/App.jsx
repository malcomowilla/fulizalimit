import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import { Route, Routes, useNavigate } from "react-router";
import Mendoza from './components/Mendoza'

function App() {

  return (
    <>
      <Routes>
        <Route path="/" element={<Mendoza />} />
      </Routes>


    

    </>
  )
}

export default App
