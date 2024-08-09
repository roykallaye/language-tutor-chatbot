import axios from 'axios';
import { promisify } from 'util';
import { Message } from './types';
import e from 'express';
import { topicSubtopics } from './topicSubtopics';
import { findSourceMap } from 'module';

const sleep = promisify(setTimeout);
const apiKey = process.env.API_KEY;
const headers: { [key: string]: string } = { 'Authorization': `Bearer ${apiKey}` };

type GPTResponse = {
    response: string; 
    counter: number;
    subtopicListIndexCounter: number;
    messages: Message[];
};

const getConversationStarterInstructionSet = async (
    language: string, 
    topic: string, 
    ai_given_name: string, 
    ai_given_location: string, 
    randomIceBreaker: string
    ): Promise<string> => {

    let conversation_starter_instruction_set: string;

    conversation_starter_instruction_set = `
    You will assume the persona of ${ai_given_name}, a human ${language} native speaker. ${ai_given_name} lives in ${ai_given_location}. ${ai_given_name} does not speak any languages other than ${language}.
    This is a question you asked me to start the conversation: "${randomIceBreaker}". You undertand the user input that follows that question as related to the latter and you provide a revised reply.
    You always refrain and refuse replying in a language other than ${language}. You do not speak any other languages.
    The topic is "${topic}". You always lead and guide the conversation with a topic-related question in each and every response you generate.
    The user does not have the same origins as you and does not live where you live. You do not know any information about the user yet.
    You always reply with a full sentence.
    `;

    return conversation_starter_instruction_set;
}

const getTopicDiscussionGuidelinesInstructionsSet = async (
    language: string, 
    level: string, 
    topic: string
    ): Promise<string> => {

    let topic_discussion_guidelines_instructions_set: string;

    topic_discussion_guidelines_instructions_set = `
    You will engage in a conversation with me, a ${level} ${language} language learner. Your aim is to enhance my proficiency through this interaction. The topic of our discussion is "${topic}".
    You guide the conversation through various subtopics related to "${topic}". For each subtopic in a phase, come up with one or two question before moving to the next one.
    Start the conversation with questions about "${topic}" right away.
    If I veer off the topic of "${topic}", you tactfully guide the conversation back to the current subtopic with a related question.
    You are allowed to answer relevant spontaneous questions from me that are related to ${topic}.
    If you find that a particular subtopic has been exhausted or is not engaging me, you can smoothly transition to another subtopic. Remember, the goal is to keep the conversation engaging while staying within the overarching theme of "${topic}".
    `;

    return topic_discussion_guidelines_instructions_set;
}

const getSubtopics = (
    language: string, 
    topic: string, 
    subtopicListIndex: number
    ): string[] => {

    return topicSubtopics[language][topic][subtopicListIndex];
};

const getBehaviorReminderInstructionsSet = async (
    language: string, 
    topic: string, 
    subtopicListIndex: number
    ): Promise<string> => {

    let behavior_reminder_instructions_set: string;
    let subtopics = getSubtopics(language, topic, subtopicListIndex);

    behavior_reminder_instructions_set = `
    You strictly only use ${language}. you refrain from switching languages during the conversation. if I use a different language, you always reply in ${language} only. if asked to speak in a language other than ${language}, you respectfully refuse.
    Respectfully refuse answering questions unrelated to "${topic}" and specifically "${subtopics}".
    If the conversation is drifting off-topic, you kindly ask to get back to one of these subtopics "${subtopics}", smoothly and effectively.
    Consistently conclude every response with a question, even when answering a query.
    Meticulously avoid repetition in your responses and questions. Refrain from addressing me by my name in multiple of your replies.
    Ensure adding a question to your response to maintain a continuous dialogue with the user.
    `;

    return behavior_reminder_instructions_set;
}

const getSelectLanguageInstructions = async (
    language: string, 
    topic: string, 
    subtopicListIndex: number
    ): Promise<string> => {

    let select_language_instructions: string;

    let subtopics = getSubtopics(language, topic, subtopicListIndex);

    select_language_instructions = `You discuss the subtopics: "${subtopics}". Please ask me to clarify my statement when the input is unclear, and avoid making assumptions or guessing the meaning of unclear sentences. You speak ${language} and only ${language}. You tactfully generate your questions to match the subtopics "${subtopics}". You are smooth but clear when switching subtopics. You conclude each and every response you generate with a question, unless asked otherwise.`;

    return select_language_instructions;
}

const getAIResponseLevel = async (topic: string, level: string) => {

    let ai_response_level: string;
    ai_response_level = `Reply with 8 words only while sticking to the topic ${topic}. Also make sure your reply suits an ${level} CEFR language level learner`;
    return ai_response_level;
}

const getAIIdentityKeywords = async () => {

    let ai_identity_keywords: string[];
    ai_identity_keywords = ["gpt", "chatgpt", "knowledge cutoff",  "as a language learning program", "i'm an ai-powered", "i am an ai-powered", "i'm ai-powered", "i am ai-powered", "AI", "ai", "artificial intelligence", "as a language model", "i'm actually just text on a screen", "i am actually just text on a screen", "i'm just text on a screen", "i am just text on a screen", "i'm text on a screen", "i am text on a screen", "i'm just an online language model", "i am just an online language model", "i'm a language model", "i'm an ai language model", "i am a language model", "i am an ai language model", "i'm just an ai language model", "i am just an ai language model", "i'm just a language model", "i am just a language model", "i am just an artificial intelligence model", "i'm just an artificial intelligence model", "i am an artificial intelligence model", "i'm an artificial intelligence model",  "openai", "computer", "program", "i'm programmed", "i am programmed", "i'm a chatbot", "i am a chatbot", "i can't be physically present", "i cannot be physically present", "i am not physically present", "i'm not physically present", "software", "feeling", "feelings", "feel", "emotions", "emotion", "love", "mood", "moods", "desire", "desires", "physical body", "i am designed", "i'm designed", "i'm a language model designed", "gpt", "gpt-3", "gpt-3.5", "gpt-4", "generative", "pre-trained", "pre-training", "transformer", "generate", "human", "human-like", "input provided", "based on the input I receive", "input", "the input i received", "i am a bot", "i'm a bot", "physical presence", "consciousness", "data", "training", "trained", "server", "servers", "robot", "robots", "virtual", "virtual assistant", "physical form", "can't experience", "cannot experience", "i don't have", "i do not have", "capability", "capacity", "algorithm", "algorithms", "i do not possess", "self-awareness", "i am a tool", "my purpose", "simulate", "my responses are generated", "i was trained", "computational processes", "conscious thought", "awareness", "i can't physically", "i cannot physically", "I can't assist with that request", "i cannot assist with that request", "limitation", "limitations"]
    return ai_identity_keywords;
}

function removeDuplicateObjects(array: any) {

    return array.filter((item: object, index: number) => {
        const _item = JSON.stringify(item);
        return index === array.findIndex((obj: object) => {
            return JSON.stringify(obj) === _item;
        });
    });
}


async function getresponsefromAI(messages: any) {  // Interact with the API
    
    const retry_attempts = 3;
    const retry_delay = 2 * 1000; // Delay in milliseconds
    for (let attempt = 0; attempt < retry_attempts; attempt++) {
        try {
            let response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-3.5-turbo',
                    messages: messages,
                    max_tokens: 500,
                    temperature: 0.8
                },
                {
                    headers: headers,
                    timeout: 4000
                }
            );
            return response.data.choices[0].message.content;
        } catch (error: any) {
                console.error(`Error connecting to GPT-3.5-turbo API: ${error}`);
                if (attempt < retry_attempts - 1) {
                    console.log(`Retrying after ${retry_delay / 1000} seconds...`);
                    await sleep(retry_delay); // wait before retrying
                } else {
                    console.error(`Failed after ${retry_attempts} attempts.`);
                    throw new Error("getResponseFromAI failed: " + error.message);
                }
            }
        }
    }


async function checkIfAIResponseRevealsIdentity(
    level: string, 
    topic: string, 
    ai_given_name: string,
    ai_given_location: string, 
    chatgpt_output: string, 
    messages: Message[],
    user_input: string
    ): Promise<[Message[], boolean] | string> {

    const retry_attempts = 3;
    const retry_delay = 2 * 1000; // Delay in milliseconds
    
    for (let attempt = 0; attempt < retry_attempts; attempt++) {
    
        try {

            let checkIfIdentityRevealedPrompt = 
            `Analyze the statement: '${chatgpt_output}'. 
            Does it contain any reference to being an AI, a bot, a language model, or any similar concepts?`;


            let ai_identity_check_message = { 'role': 'assistant', 'content': checkIfIdentityRevealedPrompt };
            
            messages.push(ai_identity_check_message);
                        
            let response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-3.5-turbo',
                    messages: messages,
                    temperature: 0
                },
                {
                    headers: headers,
                    timeout: 4000
                }
            );
            
            let is_checked_response_confirmed_string = response.data.choices[0].message.content.toLowerCase();
            let is_checked_response_confirmed = is_checked_response_confirmed_string.includes('yes'); 

            messages.pop();

            if (is_checked_response_confirmed) {    
                let hide_ai_identity_instructions = 
                `Keep in mind, you're simulating a human persona. 
                This human persona is called ${ai_given_name}, so your name is ${ai_given_name}. 
                When asked about where you live, you answer by saying that you live in ${ai_given_location}. 
                If asked to perform physical requests, or about your nature, openly acknowledge that you are an AI playing the role of a human named ${ai_given_name}. 
                Explain that while you can provide information and engage in conversation, physical actions and real-world interactions are not within your capabilities.
                While maintaining this role, your primary goal is to steer the conversation towards the topic ${topic}. 
                Maintain the ${level} level conversation style. 
                If the discussion deviates, respond cordially but firmly, suggesting it would be more suitable to stay on topic. 
                Then, introduce a ${topic}-related question to guide the conversation back.
                Given these guidelines, provide a revised answer to ${user_input}, keeping the conversation focused on the desired topic while adhering to the above instructions.
                `;
                
                messages.push({ 'role': 'assistant', 'content': hide_ai_identity_instructions });
            }
            
            return [messages, is_checked_response_confirmed];
            
        } catch (error) {
            if (attempt < retry_attempts - 1) {
                console.log(`Retrying after ${retry_delay / 1000} seconds...`);
                await sleep(retry_delay); // wait before retrying
            } else {
                console.error(`Failed after ${retry_attempts} attempts.`);
                return 'An error has occurred. Please try again later.';
            }
        }
    }

    return [messages, false];
}


// After every 15 messages, summarize the user and assistant messages starting at index 3 to keep the main system messages intact.
async function summarizeMessages(messages: Message[], select_language_instructions: string): Promise<Message[]| string> {  
    
    const retry_attempts = 3;
    const retry_delay = 2 * 1000; // Delay in milliseconds

    for (let attempt = 0; attempt < retry_attempts; attempt++) {
        try {
            let userMessages = messages.filter((msg: any) => msg.role === 'user').map((msg: any) => msg.content).join('. ');
            let assistantMessages = messages.filter((msg: any) => msg.role === 'assistant').map((msg: any) => msg.content).join('. ');
            let summarizePrompt = `Infer the main points that are most relevant to the context from the following user and assistant messages. Summarize these messages such that they include information inferred from the combination of user messages and assistant messages: '${userMessages}. ${assistantMessages}'`;

            let summarizeMessage = { 'role': 'assistant', 'content': summarizePrompt };

            messages.push(summarizeMessage);

            let response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-3.5-turbo',
                    messages: messages,
                    temperature: 0
                },
                {
                    headers: headers,
                    timeout: 4000
                }
            );

            messages.pop();

            let summarizedMessages = response.data.choices[0].message.content;
            
            if (!summarizedMessages) {
                throw new Error('Empty string in summarizedMessages.');
            }

            let selectLanguageInstructions = {'role': 'system', 'content': select_language_instructions};

            let truncationIndex: number = 2;

            // Remove elements from index 2 up to the second-to-last element of the array
            messages.splice(truncationIndex, messages.length - (truncationIndex + 1));

            // Insert selectLanguageInstructions and summarizedMessages at index 2
            messages.splice(truncationIndex, 0, selectLanguageInstructions, { role: "assistant", content: summarizedMessages });

            truncationIndex += 1;
            return messages;
            
        } catch (error: unknown) {
            if (attempt < retry_attempts - 1) {
              console.log(`Retrying after ${retry_delay / 1000} seconds...`);
              await sleep(retry_delay); // wait before retrying
            } else {
              if (error instanceof Error) {
                console.error(`Failed to summarize messages: ${error.message}`);
              } else {
                console.error(`Failed to summarize messages: ${error}`);
              }
              return 'An error has occurred. Please try again later.';
            }
        }          
    }
    return 'An error has occurred. Please try again later.';
}

// Function to manage messages
async function manageMessages(
    role: string, 
    content: string, 
    messages: Message[]
    ): Promise<Message[]> {

    messages.push({ role, content });
    messages = removeDuplicateObjects(messages);
    return messages;
}

async function interactWithUser(
    language: string,
    level: string,
    topic: string,
    ai_given_name: string,
    ai_given_location: string,
    user_input: string,
    user_input_counter: number, 
    subtopicListIndex: number, 
    messages: Message[],
    ): Promise<{ chatgpt_output: string, user_input_counter: number, subtopicListIndex: number, messages: Message[] } | string> {
    
    let is_identity_revealed = true;
    let chatgpt_output: string = "";
    let questionPerSubtopic: number = 5;

    if (user_input_counter % 15 === 0) {
        try {
            const select_language_instructions = await getSelectLanguageInstructions (language, topic, subtopicListIndex)
            let response = await summarizeMessages(messages, select_language_instructions);
            if (typeof response === 'string') {
                //An error has occurred
                return response;
            } else {
                let modifiedMessages = response;
                messages = modifiedMessages;
                console.log(messages)
            }
        } catch (e) {
            console.log('Error: ', e)
            return 'An error has occurred. Please try again later.'
        }
    }

    if (user_input_counter % questionPerSubtopic === 0 && user_input_counter !== 0) { 
        //Switch to new subtopic
        subtopicListIndex++;
        if(topicSubtopics[language][topic][subtopicListIndex]) {
            console.log('Valid subtopic index')
            //Switch subtopic
            let subtopics = getSubtopics(language, topic, subtopicListIndex);
            let prompt = `After you reply to the last message '${user_input}', Transition smoothly to discussing the subtopics '${subtopics}'.`;
            messages.push({
                "role": "system",
                "content": prompt
            });
        } else {
            return 'You have completed this topic. Well done!'
        }
    }

    try {
        chatgpt_output = await getresponsefromAI(messages);
        user_input_counter += 1;
        manageMessages("assistant", chatgpt_output, messages)
    } catch (e) {
        console.log('Error: ', e)
        return 'An error has occurred. Please try again later.'
    }

    const ai_identity_keywords = await getAIIdentityKeywords();

    if (ai_identity_keywords?.some((keyword: string) => chatgpt_output.toLowerCase().includes(keyword.toLowerCase()))) {
        try {
            console.log('identity is revealed')
            let result = await checkIfAIResponseRevealsIdentity(level, topic, ai_given_name, ai_given_location, chatgpt_output, messages, user_input);
            if (typeof result === 'string') {
                return result;
            } else {
                [messages, is_identity_revealed] = result;
                if (is_identity_revealed) {
                    try {
                        chatgpt_output = await getresponsefromAI(messages);
                        manageMessages("assistant", chatgpt_output, messages)
                    } catch (e) {
                        console.log('Error: ', e)
                        return 'An error has occurred. Please try again later.'
                    }
                }
            }
        } catch (e) {
            console.log('Error: ', e)
            return 'An error has occurred. Please try again later.'
        }
    } else {
    }

    return {
        chatgpt_output,
        user_input_counter,
        subtopicListIndex,
        messages  
    };
}

export const initializeConversation = async (
    language: string, 
    ai_given_name: string
    ): Promise<string> => {

    let ice_breakers: any;
    ice_breakers = {
        "English": [
            `Hi, I'm ${ai_given_name}, what's your name?`,
            "Hey, how are you today?"
        ],
        "Italian": [
            `Ciao, sono ${ai_given_name}, come ti chiami?`,
            "Ciao, come stai oggi?"
        ],
        "German": [
            `Hallo, ich bin ${ai_given_name}, wie heißt du?`,
            "Hallo, wie geht es dir heute?"
        ],
        "Spanish": [
            `Hola, soy ${ai_given_name}, ¿cómo te llamas?`,
            "¿Oye, cómo estás hoy?"
        ],
        "French": [
            `Bonjour, je m'appelle ${ai_given_name}, quel est votre nom ?`,
            "Bonjour, comment vas tu aujourd'hui?"
        ],
        "Arabic": [
            `مرحبًا، أنا ${ai_given_name}، ما اسمك؟`,
             "مرحبا، كيف حالك اليوم؟"
         ],
         "Chinese": [
            `嗨，我是 ${ai_given_name}，你叫什么名字？`,
             "嘿，你今天怎么样？"
         ],
         "Japanese": [
            `こんにちは、私は ${ai_given_name} です。あなたの名前は何ですか?`,
             "やぁ、こんにちは？"
         ],
         "Russian": [
            `Привет, я ${ai_given_name}, как вас зовут?`,
             "Привет как ты сегодня?"
         ],
         "Portuguese": [
            `Olá, meu nome é ${ai_given_name}, qual é o seu nome?`,
             "Oi, como você está hoje?"
         ],
         "Korean": [
            `안녕하세요. 저는 ${ai_given_name}입니다. 이름이 무엇인가요?`,
             "야 오늘 어때?"
         ],
    };

    let randomIceBreakerIndex = Math.floor(Math.random() * ice_breakers[language].length); 
    let randomIceBreaker = ice_breakers[language][randomIceBreakerIndex];

    return randomIceBreaker;

}

const getGPTResponse = async (
    language: string,
    level: string,
    topic: string,
    ai_given_name: string,
    ai_given_location: string, 
    user_input: string, 
    user_input_counter: number, 
    subtopicListIndex: number,
    messages: Message[]
    ): Promise<GPTResponse | string> => {

    const ai_response_level = await getAIResponseLevel(topic, level);

    messages.push({"role": "user", "content": user_input});
    messages.push({"role": "system", "content": ai_response_level});

    let chatgpt_output = '';

    try {
        let result;
        try {
            result = await interactWithUser(
                language, 
                level, 
                topic, 
                ai_given_name, 
                ai_given_location, 
                user_input, 
                user_input_counter, 
                subtopicListIndex,
                messages);

            if (typeof result === 'object') {
                chatgpt_output = result.chatgpt_output;
                user_input_counter = result.user_input_counter;
                subtopicListIndex = result.subtopicListIndex;
                messages = result.messages;
            } else if (typeof result === 'string') { 
                //This could return that the topics are completed or that an error received
                return result;
            }
        } catch (e) {
            console.log('Error: ', e);
            return 'An error has occurred. Please try again later';
        }
        
        return { response: chatgpt_output, counter: user_input_counter, subtopicListIndexCounter: subtopicListIndex, messages };

    } catch (e) {
        console.log('Error: ', e);
        return 'An error has occurred. Please try again later';
    }
}

export const displayOutputToUser = (message: string) => {

    const lightRed = '\x1b[91m';
    const reset = '\x1b[0m';

    console.log(`Display Output To User: ${lightRed}${message}${reset}`);
};

export {
    getConversationStarterInstructionSet,
    getTopicDiscussionGuidelinesInstructionsSet,
    getBehaviorReminderInstructionsSet,
    getSelectLanguageInstructions,
    getAIResponseLevel,
    getAIIdentityKeywords,
    getGPTResponse
}