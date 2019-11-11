require('dotenv').config();
import * as express from 'express';
import * as body_parser from 'body-parser';
import * as uuidv4 from 'uuid/v4';
import * as discord from 'discord.js';



const message_queue_map = {};
const messages_map = {};
const client_map = {};
let error_queue: Error[] = [];








const app = express();
app.use(body_parser.json());
app.use(body_parser.urlencoded({extended:false}));
app.set('view engine', 'ejs');


const clients = {};


app.post('/bot/login',async (req,res)=>{
    const uuid = uuidv4();
    console.log(req.body);
    const client = new discord.Client();

    const messages = {};
    let message_queue = [];



    
    client.on('login',()=>{
        console.log(`Bot ${uuid} logged in`);
    });
    let success = true;
    try {
        console.log(await client.login(req.body.token));
    } catch(e) {
        console.error(e);
        success=false;
    }
    if (success) {
        
        message_queue_map[uuid] = message_queue;
        messages_map[uuid] = messages;

        client.on('error',(e)=>{
            console.error(e);
            error_queue.push(e);
        });
    
        client.on('message',(msg)=>{
            if (msg.author.bot) {
                return;
            }
            message_queue.push({
                id:msg.id,
                content:msg.content
            });
            messages[msg.id] = msg;
    
        });
        client_map[uuid] = client;
        return res.json({status:'ready', uuid: uuid});
    } else {
        return res.json({status:'failure',reason:'invlaid token'});
    }

})

app.get('/bot/ping',(req,res)=> {
    // basic ping
    res.send({status:'success'});
}); 

app.get('/bot/msg/get',(req,res)=>{
    const message_queue: any[] | undefined = message_queue_map[req.headers.authorization];
    if (message_queue != undefined) {
        res.json({
            num:message_queue.length,
            messages:message_queue
        });
        message_queue.length = 0;   // apparently this clears the array
    }
});


app.post('/bot/msg/respond',async (req,res)=>{
    console.log(req.body);
    const messages = messages_map[req.headers.authorization];
    if (messages == undefined) {
        console.log('401 Unauthorized')
        return res.status(401).json({status:'failure',reason:'Unauthorized'});
    }
    const msg: discord.Message | undefined = messages[req.body.id];
    if (msg == undefined) {
        return res.json({
            status:'failure',
            reason:`Message id ${req.body.id} is not accessible`
        });
    }
    
    if (req.body.delete == true || req.body.delete == 1) {
        if (msg.deletable) {
            msg.delete();
        }
    }
    
    if (req.body.reply != undefined && req.body.reply.trim() != "") {
        try {
            await msg.channel.send(req.body.reply);
        } catch(e) {
            console.error(e);
        }
    }
    delete messages[req.body.id];

    res.json({
        status: 'success'
    });
});








// ui
app.get('/',(req,res)=>{
    res.render('index');
});
app.get('/login',(req,res)=>{
    res.render('login');
});
app.get('/register',(req,res)=>{
    res.render('register');
});


app.listen(process.env.PORT);