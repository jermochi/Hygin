import { Link } from 'react-router-dom'
import Thumbnail from './Thumbnail'
import characterImage from '../assets/character.png'
import './LandingPage.css'
import logo from '../assets/logo.png'
import logoSvg from '../assets/logo-dark.png'

const LandingPage = () => {
  return (
    <div className="landing-page">
      <header className="header">
        <div className="logo">
          <img src={logo} alt="Hygin Logo" className="logo-image" />
        </div>
      </header>
      
      <main className="main-content">
        <div className="left-section">
          {/* <h1 className="title">Hygienix</h1> */}
          <div className="svg-logo">
            <img src={logoSvg} alt="Hygin logo" className="title-logo" />
          </div>
          <p className="description">
            Hygienix is an engaging, web-based gamification platform designed to teach essential hygiene practices to children in Grades 3-6. The game transforms daily routines into a fun, interactive experience by using game elements like points, levels, and challenges. Players learn about and are motivated to practice key hygiene habits, specifically handwashing, tooth brushing, and hair washing, with the goal of building lifelong healthy behaviors.
          </p>
        </div>
        
        <div className="right-section">
          <div className="model-container">
            <img src={characterImage} alt="Character" className="character-image" />
            
            <div className="thumbnails">
              <Link to="/hairwashing">
                <Thumbnail 
                  type="hairwashing" 
                  position="hair"
                  icon="🛁"
                />
              </Link>
              <Link to="/toothbrushing">
                <Thumbnail 
                  type="toothbrushing" 
                  position="mouth"
                  icon="🦷"
                />
              </Link>
              <Link to="/handwashing">
                <Thumbnail 
                  type="handwashing" 
                  position="hands"
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