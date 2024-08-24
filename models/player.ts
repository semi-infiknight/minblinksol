import { Schema, model, models } from 'mongoose'

const PlayerSchema = new Schema({
  address: {
    type: String,
    required: [true, 'Address is required']
  },
  x_username: {
    type: String,
    required: [true, 'X Username is required']
  },
  chess_username: {
    type: String,
    required: [true, 'Chess.com Username is required']
  },
  chess_rating: {
    type: Number,
    required: [true, 'Chess.com Rating is required']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    immutable: true
  }
});

const Player = models.Player || model('Player', PlayerSchema)

export default Player
