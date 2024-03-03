const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, {
})
.then(() => {
    console.log('Connected to database');
})
.catch((error) => {
    console.error('Error connecting to database:', error);
});
