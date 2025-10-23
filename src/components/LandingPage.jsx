import { Link } from 'react-router-dom'
import Thumbnail from './Thumbnail'
import './LandingPage.css'

const LandingPage = () => {
  return (
    <div className="landing-page">
      <header className="header">
        <div className="logo">logo</div>
      </header>
      
      <main className="main-content">
        <div className="left-section">
          <h1 className="title">Hygin</h1>
          <h2 className="subtitle">HYGIN desc</h2>
          <p className="description">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
          </p>
        </div>
        
        <div className="right-section">
          <div className="model-container">
            <div className="stick-figure">
              <div className="head"></div>
              <div className="body"></div>
              <div className="left-arm"></div>
              <div className="right-arm"></div>
              <div className="left-leg"></div>
              <div className="right-leg"></div>
            </div>
            
            <div className="thumbnails">
              <Link to="/hairwashing">
                <Thumbnail 
                  type="hairwashing" 
                  position="top"
                  icon="🛁"
                />
              </Link>
              <Link to="/toothbrushing">
                <Thumbnail 
                  type="toothbrushing" 
                  position="right"
                  icon="🦷"
                />
              </Link>
              <Link to="/handwashing">
                <Thumbnail 
                  type="handwashing" 
                  position="left"
                  icon="🧼"
                />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default LandingPage
