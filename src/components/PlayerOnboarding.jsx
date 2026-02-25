import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPlayer } from '../utils/scoreManager'
import HygieneFallingIcons from './HygieneFallingIcons'
import characterImage from '../assets/character.png'
import logo from '../assets/logo.png'
import logoSvg from '../assets/logo-dark.png'
import './PlayerOnboarding.css'

const PlayerOnboarding = () => {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        fullName: '',
        grade: '',
        section: '',
        age: '',
        gender: ''
    })
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
        // Clear error when user starts typing
        if (error) setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        // Validation
        if (!formData.fullName.trim()) {
            setError('Please enter your full name')
            return
        }
        if (!formData.grade) {
            setError('Please select your grade')
            return
        }
        if (!formData.section.trim()) {
            setError('Please enter your section')
            return
        }
        if (!formData.age || formData.age < 1 || formData.age > 100) {
            setError('Please enter a valid age')
            return
        }
        if (!formData.gender) {
            setError('Please select your gender')
            return
        }

        setIsSubmitting(true)

        try {
            const playerId = await createPlayer({
                fullName: formData.fullName.trim(),
                grade: formData.grade,
                section: formData.section.trim(),
                age: formData.age,
                gender: formData.gender
            })

            if (playerId) {
                // Successfully created player, navigate to landing page
                navigate('/')
            } else {
                setError('Failed to create player. Please try again.')
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.')
            console.error('Error in handleSubmit:', err)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="onboarding-container">
            {/* Landing page background (blurred) */}
            <div className="onboarding-backdrop">
                <HygieneFallingIcons />
                <header className="backdrop-header">
                    <div className="backdrop-logo">
                        <img src={logo} alt="Hygin Logo" className="backdrop-logo-image" />
                    </div>
                </header>
                <main className="backdrop-main-content">
                    <div className="backdrop-left-section">
                        <div className="backdrop-svg-logo">
                            <img src={logoSvg} alt="Hygin logo" className="backdrop-title-logo" />
                        </div>
                        <p className="backdrop-description">
                            Hygienix is an engaging, web-based gamification platform designed to teach essential hygiene practices to children in Grades 3-6.
                        </p>
                    </div>
                    <div className="backdrop-right-section">
                        <div className="backdrop-model-container">
                            <img src={characterImage} alt="Character" className="backdrop-character-image" />
                        </div>
                    </div>
                </main>
            </div>

            {/* Onboarding form card */}
            <div className="onboarding-card">
                <h1 className="onboarding-title">Welcome to Hygienix!</h1>
                <p className="onboarding-subtitle">Let's get started with your hygiene journey</p>

                <form className="onboarding-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="fullName" className="form-label">Full Name</label>
                        <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            className="form-input"
                            placeholder="Enter your full name"
                            value={formData.fullName}
                            onChange={handleChange}
                            disabled={isSubmitting}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="grade" className="form-label">Grade</label>
                        <select
                            id="grade"
                            name="grade"
                            className="form-input form-select"
                            value={formData.grade}
                            onChange={handleChange}
                            disabled={isSubmitting}
                        >
                            <option value="" disabled>Select your grade</option>
                            <option value="Grade 3">Grade 3</option>
                            <option value="Grade 4">Grade 4</option>
                            <option value="Grade 5">Grade 5</option>
                            <option value="Grade 6">Grade 6</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="section" className="form-label">Section</label>
                        <input
                            type="text"
                            id="section"
                            name="section"
                            className="form-input"
                            placeholder="Enter your section"
                            value={formData.section}
                            onChange={handleChange}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="age" className="form-label">Age</label>
                        <input
                            type="number"
                            id="age"
                            name="age"
                            className="form-input"
                            placeholder="Enter your age"
                            min="1"
                            max="100"
                            value={formData.age}
                            onChange={handleChange}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Gender</label>
                        <div className="gender-options">
                            <label className={`gender-option ${formData.gender === 'Male' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="gender"
                                    value="Male"
                                    checked={formData.gender === 'Male'}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                />
                                <span className="gender-label">Male</span>
                            </label>
                            <label className={`gender-option ${formData.gender === 'Female' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="gender"
                                    value="Female"
                                    checked={formData.gender === 'Female'}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                />
                                <span className="gender-label">Female</span>
                            </label>
                        </div>
                    </div>

                    {error && <div className="form-error">{error}</div>}

                    <button
                        type="submit"
                        className="onboarding-submit-btn"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Starting...' : 'Start Playing!'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default PlayerOnboarding
