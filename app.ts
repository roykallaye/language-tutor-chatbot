require('dotenv').config();
import express, { Request, Response, Application } from 'express';
import { Message } from './types';
import readline from 'readline';
import { 
    initializeConversation, 
    getConversationStarterInstructionSet, 
    getTopicDiscussionGuidelinesInstructionsSet,
    getSelectLanguageInstructions,
    getGPTResponse, 
    displayOutputToUser
 } from './gpt';

const app: Application = express();
const port: number = 3000;

app.get('/', (req: Request, res: Response) => res.send('Hello World!'));

const server = app.listen(port);

server.on('error', (error: Error) => {
  console.error(`Oops! Something went wrong. Our team is looking into it.`);
});

const rl: readline.Interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const getUserInputAsync = (): Promise<string> => {
    return new Promise((resolve) => {
        process.stdout.write("Input From User: ");

        // Temporarily mute the output to prevent echoing
        const oldWrite = process.stdout.write;
        process.stdout.write = () => true;

        // Capture the user input
        rl.question('', (user_input) => {
            // Restore the original stdout.write function
            process.stdout.write = oldWrite;

            console.log();

            resolve(user_input);
        });
    });
};


(async () => {
    let language = 'English'
    let level = 'A1'
    let topic = 'About Myself'
    let ai_given_name = 'Lewis'
    let ai_given_location: string;

    let messages: Message[] = [];

    let personaDetails: any = {"Lewis": "Manchester, UK", "Anna": "Rome, Italy", "Michaela": "Berlin, Germany", "Carlos": "Madrid, Spain", "Marie": "Paris, France",};
    ai_given_location = personaDetails[ai_given_name];

    let subtopicListIndex: number;
    subtopicListIndex = 1;

    let user_input_counter: number = 1;

    let randomIceBreaker: string = '';
    randomIceBreaker = await initializeConversation(language, ai_given_name);
    displayOutputToUser(randomIceBreaker);

    const conversation_starter_instruction_set = await getConversationStarterInstructionSet (language, topic, ai_given_name, ai_given_location, randomIceBreaker );
    const topic_discussion_guidelines_instructions_set = await getTopicDiscussionGuidelinesInstructionsSet(language, level, topic);
    const select_language_instructions = await getSelectLanguageInstructions (language, topic, subtopicListIndex)

    messages.push({"role": "system", "content": conversation_starter_instruction_set});

    messages.push({ "role": "system", "content": topic_discussion_guidelines_instructions_set });
    messages.push({ "role": "system", "content": select_language_instructions });

    messages.push({ "role": "assistant", "content": randomIceBreaker});

    
    while (true) {
        try {
            const user_input = await getUserInputAsync();
            
            const result = await getGPTResponse(language, level, topic, ai_given_name, ai_given_location, user_input, user_input_counter, subtopicListIndex, messages);
            
            let response, counter, subtopicListIndexCounter;
            if (typeof result === 'object') {
                ({ response, counter, subtopicListIndexCounter, messages } = result);
            } else if (typeof result === 'string') {
                if (result === 'You have completed this topic. Well done!') {
                    //Topic Completed. Return it to the frontend
                    displayOutputToUser(result);
                } else {
                    //An error occurred. Return it to the frontend
                    displayOutputToUser(result);
                }
                break;
            }

            user_input_counter = counter as number;
            subtopicListIndex = subtopicListIndexCounter as number;
            if (!response) throw new Error;
            displayOutputToUser(response);

        } catch (error: unknown) {
            displayOutputToUser('We ran into a problem and our team is on it. Please try again later.');
            await new Promise(resolve => setTimeout(resolve, 1000));
            break;
        }
    }
})();