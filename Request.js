import express from 'express';
const app = express()
const port = 443

import fs from 'fs';
import axios from 'axios'
import ngrok from 'ngrok';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

import { client } from "@gradio/client";
//const clientRest = await client("http://127.0.0.1:7860/");

let CharactersUsed = 0

// NGROK Auth Key can be gotten from 'https://ngrok.com/'
// Create an Account and goto "Your Authtoken"
// Paste the Auth Token below!

// DO NOT SET THE API KEYS HERE
// SET THE API KEYS AT 'Config.yml'

fs.readFile( "Config.json", "utf8", ( error, data ) => {

    const Data = JSON.parse( data )

    const ngrokAuthenticationKey = Data.NgrokAPIKey
    const DiscordBotToken = Data.DiscordToken
    const DiscordChannelID = Data.ChannelID

    if( Data.NgrokAPIKey == undefined ) { throw( "NO NGROK API KEY" ); }
    if( Data.DiscordToken == undefined ) { throw( "NO DISCORD BOT TOKEN" ); }
    if( Data.ChannelID == "" ) { throw( "DISCORD CHANNELID REQUIRED" ) }

    tokensCollected( ngrokAuthenticationKey, DiscordBotToken, DiscordChannelID )

})

function tokensCollected( ngrokAuthenticationKey, DiscordBotToken, DiscordChannelID ) {

    (async function() {
        
        const url = await ngrok.connect( { 
            proto: 'http',
            addr: 'http://localhost:443',
            authtoken: ngrokAuthenticationKey,
            configPath: './ngrokConfig/ngrok.yml'
        });
        console.log( "Set the NGROK URL on Starfall to : " + url )
    })();

    app.get('/:Voice/:IndexRate/:Protect/:Text', (req, response) => {

        console.log( req.params )

        const Text = req.params.Text
        const VoiceID = req.params.Voice

        const IndexRate = req.params.IndexRate
        const Protect  = req.params.Protect
        
        const result = clientRest.predict(0, [		
                "Astolfo", // string (Option from: ['Astolfo']) in 'Model' Dropdown component		
                0, // number (numeric value between -100 and 100) in 'Speech speed (%)' Slider component		
                Text, // string  in 'Input Text' Textbox component		
                VoiceID, 
                8, // number  in 'Transpose (the best value depends on the models and speakers)' Number component		
                "rmvpe", // string  in 'Pitch extraction method (pm: very fast, low quality, rmvpe: a little slow, high quality)' Radio component		
                IndexRate, // number (numeric value between 0 and 1) in 'Index rate' Slider component		
                Protect, // number (numeric value between 0 and 0.5) in 'Protect' Slider component
            ]).then( ( Information ) => {

                const URL = Information.data[2].data

                    axios({
                        method: 'get',
                        url: URL,
                        responseType: 'arraybuffer', 
                        }
                    )
                  .then( audio => {
                                    
                    const audioData = audio.data;
                    
                    try {
        
                        Client.post( Routes.channelMessages( DiscordChannelID ), {

                            body: {
                                content: "Message = [ '" + Text + "' ]"
                            },
        
                            files: [{
                                data: audioData,
                                name: 'voice.mp3'
                            }]
                            
                        }).then( ( data ) => {
                            
                            const URL = data.attachments[0].proxy_url

                            CharactersUsed = CharactersUsed + Text.length
        
                            console.log( CharactersUsed )

                            response.send( URL )
        
                        })
        
                    } catch( error ) {
                        throw( error )
                    }
        
                })

            });

    })

    app.listen(port, () => {
        
        console.log(`Example app listening on port ${port}`)
        
    })

    // Discord Bot Setup
    
    const Client = new REST( { version: '10' } ).setToken( DiscordBotToken )

}