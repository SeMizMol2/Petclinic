require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const testRoutes = require('./routes/test.routes');
const petRoutes = require('./routes/pet.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

const routes = require('./routes');
app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('Petclinic API is running');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
