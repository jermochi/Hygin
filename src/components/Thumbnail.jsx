import './Thumbnail.css'

const Thumbnail = ({ type, position, icon }) => {
  return (
    <div className={`thumbnail thumbnail-${position}`}>
      <div className="thumbnail-icon">{icon}</div>
    </div>
  )
}

export default Thumbnail
