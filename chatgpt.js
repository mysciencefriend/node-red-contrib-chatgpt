module.exports = (RED) => {
    // Import required modules
    const { OpenAI } = require("openai");

    // Define a list of acceptable topics for the node
    const ACCEPT_TOPIC_LIST = [
        "gpt-4o-mini",
        "gpt4o",
        "image",
        "turbo",
        "gpt4",
        "dalle3",
        "gpt-image-1",
    ].map((item) => item.toLowerCase());

    // Main function that gets executed when a message is received
    const main = function (config) {
        const node = this;
        RED.nodes.createNode(node, config);

        // Handle incoming messages
        node.on("input", async(msg) => {
            // Extract API key from credentials or message
            const API_KEY = this.credentials.API_KEY || msg.API_KEY;

            // Initialize OpenAI configuration with the provided API key
            const configuration = {
                apiKey: API_KEY,
            };

            // Handle BaseUrl configuration if provided
            if (config.BaseUrl) {
                try {
                    // Update the base path if a valid URL is provided
                    const url = new URL(config.BaseUrl);
                    if (url.pathname === "/") {
                        url.pathname = "/v1";
                    }
                    configuration.basePath = url.toString();
                } catch {
                    // Display an error status if BaseUrl is not a valid URL
                    node.status({
                        fill: "red",
                        shape: "dot",
                        text: `BaseUrl(${config.BaseUrl}) isn't a valid url`,
                    });
                    return;
                }
            }

            // Initialize the OpenAI API client
            const openai = new OpenAI({apiKey: API_KEY});

            // Set node status to indicate processing
            node.status({
                fill: "green",
                shape: "dot",
                text: "Processing...",
            });

            // Check and normalize the provided topic in the message
            if (config.topic !== "__EMPTY__") {
                msg.topic = config.topic;
            }
            if (msg.topic) {
                msg.topic = msg.topic.toLowerCase();
            }

            // Validate if the provided topic is in the accepted topic list
            if (!ACCEPT_TOPIC_LIST.includes(msg.topic) && msg.topic !== "__empty__") {
                // Set node status and log error if the topic is incorrect
                node.status({
                    fill: "red",
                    shape: "dot",
                    text: "msg.topic is incorrect",
                });
                node.error(`msg.topic must be a string set to one of the following values: ${ACCEPT_TOPIC_LIST.map((item) => ` '${item}' `).join(", ")}`);

                // Send the message
                node.send(msg);
            } else if (msg.topic === "image") {
                // Process messages with the "image" topic
                try {
                    // Make a request to OpenAI API for image creation
                    const response = await openai.images.generate({
                        prompt: msg.payload,
                        n: parseInt(msg.n) || 1,
                        size: msg.size || "256x256",
                        response_format: msg.format || "url",
                    });

                    // Process the response based on the specified format
                    if (msg.format === "b64_json") {
                        msg.payload = response.data[0].b64_json;
                    } else {
                        msg.payload = response.data[0].url;
                    }

                    // Set additional properties in the message
                    msg.full = response;

                    // Set node status
                    node.status({
                        fill: "blue",
                        shape: "dot",
                        text: "Response complete",
                    });

                    // Send the message
                    node.send(msg);
                    // Handle errors
                } catch (error) {
                    // Set node status
                    node.status({
                        fill: "red",
                        shape: "dot",
                        text: "Error",
                    });
                    if (error.response) {
                        node.error(error.response, msg);
                    } else {
                        node.error(error.message, msg);
                    }
                }
            } else if (msg.topic === "dalle3") {
                // Process messages with the "dalle3" topic
                try {
                    // Make a request to OpenAI API for image creation
                    const response = await openai.images.generate({
                        model: "dall-e-3",
                        prompt: msg.payload,
                        n: parseInt(msg.n) || 1,
                        size: msg.size || "1024x1024",
                    });
                    msg.payload = response.data[0].url;

                    // Set additional properties in the message
                    msg.full = response;

                    // Set node status
                    node.status({
                        fill: "blue",
                        shape: "dot",
                        text: "Response complete",
                    });

                    // Send the message
                    node.send(msg);
                    // Handle errors
                } catch (error) {
                    // Set node status
                    node.status({
                        fill: "red",
                        shape: "dot",
                        text: "Error",
                    });
                    if (error.response) {
                        node.error(error.response, msg);
                    } else {
                        node.error(error.message, msg);
                    }
                }
            } else if (msg.topic === "gpt-image-1") {
                // Process messages with the "gpt-image-1" topic
                try {
                    // Make a request to OpenAI API for image creation
                    const response = await openai.images.generate({
                        model: "gpt-image-1",
                        prompt: msg.payload,
                        n: parseInt(msg.n) || 1,
                        size: msg.size || "1024x1024",
                    });
                    msg.payload = response.data[0].b64_json;

                    // Set additional properties in the message
                    msg.full = response;

                    // Set node status
                    node.status({
                        fill: "blue",
                        shape: "dot",
                        text: "Response complete",
                    });

                    // Send the message
                    node.send(msg);
                    // Handle errors
                } catch (error) {
                    // Set node status
                    node.status({
                        fill: "red",
                        shape: "dot",
                        text: "Error",
                    });
                    if (error.response) {
                        node.error(error.response, msg);
                    } else {
                        node.error(error.message, msg);
                    }
                }
            } else if (msg.topic === "turbo") {
                // Process messages with the "turbo" topic
                try {
                    if (typeof msg.history === "undefined")
                        msg.history = [];
                    msg.topic = "turbo";
                    const input = {
                        role: "user",
                        content: msg.payload,
                    };
                    msg.history.push(input);
                    // Request completion from gpt-3.5-turbo model
                    const response = await openai.chat.completions.create({
                        model: "gpt-3.5-turbo",
                        messages: msg.history,
                        temperature: parseInt(msg.temperature) || 1,
                        top_p: parseInt(msg.top_p) || 1,
                        n: parseInt(msg.n) || 1,
                        stream: msg.stream || false,
                        stop: msg.stop || null,
                        max_tokens: parseInt(msg.max_tokens) || 4000,
                        presence_penalty: parseInt(msg.presence_penalty) || 0,
                        frequency_penalty: parseInt(msg.frequency_penalty) || 0,
                    });
                    const trimmedContent =
                        response.choices[0].message.content.trim();
                    const result = {
                        role: "assistant",
                        content: trimmedContent,
                    };
                    msg.history.push(result);
                    // Extract completed text from the response
                    msg.payload = response.choices[0].message.content;
                    msg.full = response;
                    // Set node status
                    node.status({
                        fill: "blue",
                        shape: "dot",
                        text: "Response complete",
                    });
                    // Send the message
                    node.send(msg);
                    // Handle errors
                } catch (error) {
                    // Set node status
                    node.status({
                        fill: "red",
                        shape: "dot",
                        text: "Error",
                    });
                    if (error.response) {
                        node.error(error.response, msg);
                    } else {
                        node.error(error.message, msg);
                    }
                }
            } else if (msg.topic === "gpt4") {
                // Process messages with the "gpt4" topic
                try {
                    // Handle GPT-4 conversation logic
                    if (typeof msg.history === "undefined")
                        msg.history = [];
                    msg.topic = "gpt4";
                    const input = {
                        role: "user",
                        content: msg.payload,
                    };
                    msg.history.push(input);

                    // Request completion from GPT-4 model
                    const response = await openai.chat.completions.create({
                        model: "gpt-4",
                        messages: msg.history,
                        temperature: parseInt(msg.temperature) || 1,
                        top_p: parseInt(msg.top_p) || 1,
                        n: parseInt(msg.n) || 1,
                        stream: msg.stream || false,
                        stop: msg.stop || null,
                        max_tokens: parseInt(msg.max_tokens) || 4000,
                        presence_penalty: parseInt(msg.presence_penalty) || 0,
                        frequency_penalty: parseInt(msg.frequency_penalty) || 0,
                    });
                    const trimmedContent =
                        response.choices[0].message.content.trim();
                    const result = {
                        role: "assistant",
                        content: trimmedContent,
                    };
                    msg.history.push(result);
                    // Extract completed text from the response
                    msg.payload = response.choices[0].message.content;
                    msg.full = response;
                    // Set node status
                    node.status({
                        fill: "blue",
                        shape: "dot",
                        text: "Response complete",
                    });
                    // Send the message
                    node.send(msg);
                    // Handle errors
                } catch (error) {
                    // Set node status
                    node.status({
                        fill: "red",
                        shape: "dot",
                        text: "Error",
                    });
                    if (error.response) {
                        node.error(error.response, msg);
                    } else {
                        node.error(error.message, msg);
                    }
                }
            } else if (msg.topic === "gpt4o") {
                // Process messages with the "gpt4o" topic
                try {
                    // Handle GPT-4 conversation logic
                    if (typeof msg.history === "undefined")
                        msg.history = [];
                    msg.topic = msg.model ? msg.model : "gpt4o";
                    const input = {
                        role: "user",
                        content: msg.payload,
                    };
                    msg.history.push(input);

                    // Request completion from GPT-4 model
                    const response = await openai.chat.completions.create({
                        model: msg.model ? msg.model : "gpt-4o",
                        messages: msg.history,
                        temperature: parseInt(msg.temperature) || 1,
                        top_p: parseInt(msg.top_p) || 1,
                        n: parseInt(msg.n) || 1,
                        stream: msg.stream || false,
                        stop: msg.stop || null,
                        max_tokens: parseInt(msg.max_tokens) || 4000,
                        presence_penalty: parseInt(msg.presence_penalty) || 0,
                        frequency_penalty: parseInt(msg.frequency_penalty) || 0,
                    });
                    const trimmedContent =
                        response.choices[0].message.content.trim();
                    const result = {
                        role: "assistant",
                        content: trimmedContent,
                    };
                    msg.history.push(result);
                    // Extract completed text from the response
                    msg.payload = response.choices[0].message.content;
                    msg.full = response;
                    // Set node status
                    node.status({
                        fill: "blue",
                        shape: "dot",
                        text: "Response complete",
                    });
                    // Send the message
                    node.send(msg);
                    // Handle errors
                } catch (error) {
                    // Set node status
                    node.status({
                        fill: "red",
                        shape: "dot",
                        text: "Error",
                    });
                    if (error.response) {
                        node.error(error.response, msg);
                    } else {
                        node.error(error.message, msg);
                    }
                }
            } else {
                // Process messages with the "gpt-4o-mini" topic
                try {
                    // Handle GPT-4 conversation logic
                    if (typeof msg.history === "undefined")
                        msg.history = [];
                    msg.topic = msg.model ? msg.model : "gpt-4o-mini";
                    const input = {
                        role: "user",
                        content: msg.payload,
                    };
                    msg.history.push(input);

                    // Request completion from GPT-4 model
                    const response = await openai.chat.completions.create({
                        model: msg.model ? msg.model : "gpt-4o-mini",
                        messages: msg.history,
                        temperature: parseInt(msg.temperature) || 1,
                        top_p: parseInt(msg.top_p) || 1,
                        n: parseInt(msg.n) || 1,
                        stream: msg.stream || false,
                        stop: msg.stop || null,
                        max_tokens: parseInt(msg.max_tokens) || 4000,
                        presence_penalty: parseInt(msg.presence_penalty) || 0,
                        frequency_penalty: parseInt(msg.frequency_penalty) || 0,
                    });
                    const trimmedContent =
                        response.choices[0].message.content.trim();
                    const result = {
                        role: "assistant",
                        content: trimmedContent,
                    };
                    msg.history.push(result);
                    // Extract completed text from the response
                    msg.payload = response.choices[0].message.content;
                    msg.full = response;
                    // Set node status
                    node.status({
                        fill: "blue",
                        shape: "dot",
                        text: "Response complete",
                    });
                    // Send the message
                    node.send(msg);
                    // Handle errors
                } catch (error) {
                    // Set node status
                    node.status({
                        fill: "red",
                        shape: "dot",
                        text: "Error",
                    });
                    if (error.response) {
                        node.error(error.response, msg);
                    } else {
                        node.error(error.message, msg);
                    }
                }
            }
        });
        // Clear the node status on node close
        node.on("close", () => {
            node.status({});
        });
    };

    // Register the node type with Node-RED
    RED.nodes.registerType("chatgpt", main, {
        credentials: {
            API_KEY: { type: "text" },
        },
    });
};
