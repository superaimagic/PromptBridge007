import config from './config';
import app from './app';
import pool from './config/database';

const start = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('Database connected successfully');
    conn.release();

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
