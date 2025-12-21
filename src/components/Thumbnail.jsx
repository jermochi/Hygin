import './Thumbnail.css'

const Thumbnail = ({ type, position, icon, label }) => {
  return (
    <div className={`thumbnail thumbnail-${position}`}>
      <div className="thumbnail-icon">{icon}</div>
      {label && <span className="thumbnail-label">{label}</span>}
    </div>
  )
}

export default Thumbnail
