require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// รวม Route ทั้งหมด
const authRoutes = require('./routes/auth.routes');
const testRoutes = require('./routes/test.routes');
const petRoutes = require('./routes/pet.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const receiptRoutes = require('./routes/receipt.routes');
const historyRoutes = require('./routes/history.routes');
const serviceRoutes = require('./routes/services.routes');
const treatmentRoutes = require('./routes/treatments.routes');
const ownerRoutes = require('./routes/owner.routes');
const expenseRoutes = require('./routes/expense.routes');
const clinicRoutes = require('./routes/clinic.routes');
const reportRoutes = require('./routes/reports.routes');

app.use(cors());
app.use(express.json());

// เปิดทางเข้าให้คนภายนอกดูรูปได้ (บรรทัดนี้บรรทัดเดียวพอสำหรับเรื่องรูปใน app.js)
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/treatments', treatmentRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/clinic', clinicRoutes);
app.use('/api/reports', reportRoutes);


const routes = require('./routes');
app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('Petclinic API is running');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
