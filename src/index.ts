import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { webhookRouter } from './webhook/webhook-handler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/webhook', webhookRouter);

app.get('/', (req, res) => {
  res.json({ 
    message: 'AI Code Reviewer API', 
    status: 'running',
    endpoints: ['/health', '/webhook/github']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`AI Code Reviewer server running on port ${PORT}`);
});