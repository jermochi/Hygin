import React from 'react';
import {
    FaShower,
    FaSoap,
    FaTeeth,
    FaStar,
    FaCrown,
    FaTint,
    FaTrophy,
    FaBacteria,
    FaHeart
} from 'react-icons/fa';
import {
    GiToothbrush,
    GiSoap,
    GiWaterDrop,
    GiBubblingBowl
} from 'react-icons/gi';
import './HygieneFallingIcons.css';

const HygieneFallingIcons = ({ count = 100 }) => {
    const iconComponents = [
        FaShower, FaSoap, FaTeeth, FaStar, FaCrown, FaTint, FaTrophy, FaBacteria, FaHeart,
        GiToothbrush, GiSoap, GiWaterDrop, GiBubblingBowl
    ];

    return (
        <div className="hygiene-falling-icons">
            {Array.from({ length: count }).map((_, index) => {
                // choose an icon and provide a safe fallback if undefined
                const IconComponent = iconComponents[Math.floor(Math.random() * iconComponents.length)] || FaSparkles;

                return (
                    <div
                        key={index}
                        className="hygiene-icon"
                        style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`, // reduced so icons appear sooner
                            animationDuration: `${6 + Math.random() * 10}s`,
                            fontSize: `${16 + Math.random() * 20}px`,
                            opacity: 0.5 + Math.random() * 0.5,
                            color: `hsl(${180 + Math.random() * 90}, 70%, 60%)`
                        }}
                    >
                        <IconComponent />
                    </div>
                );
            })}
        </div>
    );
};

export default HygieneFallingIcons;