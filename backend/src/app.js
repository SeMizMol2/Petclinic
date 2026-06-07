require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const testRoutes = require('./routes/test.routes');
const petRoutes = require('./routes/pet.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const receiptRoutes = require('./routes/receipt.routes');
// ดึงไฟล์ history.routes.js มาใช้งาน
const historyRoutes = require('./routes/history.routes');
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/receipts', receiptRoutes);


const routes = require('./routes');
app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('Petclinic API is running');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
