# Social Media Microservices

## Overview

This project is a social media platform built using a microservices architecture with Node.js and Express. It includes services for user identity management, post creation and management, media uploads, and search functionality. The system uses an API Gateway for routing, MongoDB for data persistence, Redis for caching and rate limiting, and RabbitMQ for event-driven communication between services.

## Architecture

The architecture consists of the following components:

- **API Gateway**: Acts as a single entry point for all client requests. Handles authentication, rate limiting, and proxies requests to the appropriate microservices.
- **Identity Service**: Manages user registration, login, logout, and token refresh. Stores user data in MongoDB and uses Redis for rate limiting.
- **Post Service**: Handles CRUD operations for posts. Stores posts in MongoDB and publishes events via RabbitMQ for inter-service communication.
- **Media Service**: Manages file uploads to Cloudinary and provides endpoints for retrieving and deleting media files. Listens to RabbitMQ events for cleanup.
- **Search Service**: Provides search functionality for posts. Assumed to index posts for efficient querying.
- **Infrastructure**: MongoDB for databases, Redis for caching and rate limiting, RabbitMQ for message queuing.

All services are containerized using Docker and orchestrated with Docker Compose.

## Services

### API Gateway
- Routes requests to microservices
- JWT-based authentication
- Rate limiting with Redis
- Security headers with Helmet
- CORS support

### Identity Service
- User registration and login
- Password hashing with Argon2
- JWT token generation and refresh
- Input validation with Joi
- Rate limiting

### Post Service
- Create, read, update, delete posts
- User authentication required
- Event publishing for post deletions
- Validation with Joi

### Media Service
- File upload with Multer (up to 5MB)
- Cloudinary integration for storage
- Retrieve and delete media files
- Event handling for related post deletions

### Search Service
- Search posts endpoint
- Authentication required

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis with ioredis
- **Message Queue**: RabbitMQ with amqplib
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, CORS, Argon2 for hashing
- **Validation**: Joi
- **Logging**: Winston
- **Media Storage**: Cloudinary
- **File Uploads**: Multer
- **Rate Limiting**: express-rate-limit with Redis
- **Containerization**: Docker, Docker Compose

## Prerequisites

- Docker and Docker Compose installed
- Node.js (for local development, but Docker is recommended)
- MongoDB (handled by Docker Compose)
- Redis (handled by Docker Compose)
- RabbitMQ (handled by Docker Compose)

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd social-media-microservices
   ```

2. Ensure Docker and Docker Compose are installed.

## Environment Variables

Create `.env` files in each service directory with the following variables:

### API Gateway
- `PORT`: Port for the gateway (e.g., 3000)
- `JWT_SECRET`: Secret for JWT verification
- `REDIS_URL`: Redis connection URL
- `IDENTITY_SERVICE_URL`: URL for identity service
- `POST_SERVICE_URL`: URL for post service
- `MEDIA_SERVICE_URL`: URL for media service
- `SEARCH_SERVICE_URL`: URL for search service

### Identity Service
- `PORT`: Port for the service (e.g., 3001)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT signing
- `JWT_REFRESH_SECRET`: Secret for refresh tokens
- `REDIS_URL`: Redis connection URL

### Post Service
- `PORT`: Port for the service (e.g., 3002)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT verification
- `RABBITMQ_URL`: RabbitMQ connection URL
- `REDIS_URL`: Redis connection URL

### Media Service
- `PORT`: Port for the service (e.g., 3003)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT verification
- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Cloudinary API key
- `CLOUDINARY_API_SECRET`: Cloudinary API secret
- `RABBITMQ_URL`: RabbitMQ connection URL
- `REDIS_URL`: Redis connection URL

### Search Service
- `PORT`: Port for the service (e.g., 3004)
- `MONGODB_URI`: MongoDB connection string (or search index URI)
- `JWT_SECRET`: Secret for JWT verification
- `RABBITMQ_URL`: RabbitMQ connection URL
- `REDIS_URL`: Redis connection URL

## Running the Application

1. Start all services using Docker Compose:
   ```
   docker-compose up --build
   ```

2. The API Gateway will be available at `http://localhost:3000`

For development, you can run individual services locally:
```
cd <service-directory>
npm install
npm run dev
```

## API Documentation

### Authentication Endpoints (via API Gateway)
- `POST /auth/register`: Register a new user
- `POST /auth/login`: Login user
- `POST /auth/logout`: Logout user
- `POST /auth/refreshToken`: Refresh access token

### Post Endpoints
- `POST /posts/createPost`: Create a new post (auth required)
- `GET /posts/getAllPosts`: Get all posts (auth required)
- `GET /posts/getPostById/:id`: Get post by ID (auth required)
- `PUT /posts/updatePost/:id`: Update post (auth required)
- `DELETE /posts/deletePost/:id`: Delete post (auth required)

### Media Endpoints
- `POST /media/upload`: Upload a file (auth required, multipart/form-data)
- `GET /media/files`: Get all user files (auth required)
- `DELETE /media/files/:id`: Delete a file (auth required)

### Search Endpoints
- `GET /search/posts`: Search posts (auth required, query params for search)

All endpoints require authentication except registration and login.
