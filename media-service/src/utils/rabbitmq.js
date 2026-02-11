const amqp = require("amqplib");
const logger = require("./logger");

let connection;
let channel;

const RABBIT_MQ_URL = process.env.RABBIT_MQ_URL;
const exchangeName = "post_exchange";

const connectRabbitMQ = async () => {
    try {
        connection = await amqp.connect(RABBIT_MQ_URL);
        channel = await connection.createChannel();

        await channel.assertExchange(exchangeName, "topic", { durable: true });
        logger.info("Connected to RabbitMQ");
        return channel;
    } catch (error) {
        logger.error("Failed to connect to RabbitMQ", error);
        throw error;
    }
};

const publishToQueue = async (routingKey, message) => {
    if (!channel) {
        await connectRabbitMQ();
    }

    channel.publish(
        exchangeName,
        routingKey,
        Buffer.from(JSON.stringify(message))
    );
    logger.info(`Event published: ${routingKey}`);
}

const consumeEvents = async (routingKey, callback) => {
    if (!channel) {
        await connectRabbitMQ();
    }

    const q = await channel.assertQueue("", { exclusive: true });
    await channel.bindQueue(q.queue, exchangeName, routingKey);
    channel.consume(q.queue, (msg) => {
        if (msg !== null) {
            const content = JSON.parse(msg.content.toString());
            callback(content);
            channel.ack(msg);
        }
    })
    logger.info(`Subscribed to event: ${routingKey}`);
}

module.exports = { connectRabbitMQ, publishToQueue, consumeEvents };