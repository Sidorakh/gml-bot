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
        const parse_command = (req.body.parse_commands ? true : false);
        const prefix = parse_command ? req.body.command_prefix : '';

        console.log(parse_command);
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
            let command_data = undefined;
            if (parse_command) {
                let text = msg.content;
                if (text[0] == prefix) {
                    text = text.slice(1);
                    const parts = text.split(' ');
                    const command = parts.shift();
                    const args = parts.join(' ').match(/[^\s"']+|"([^"]*)"|'([^']*)'/g);
                    command_data = {
                        command:command,
                        args:args
                    }
                    console.log(command_data);
                } else {
                    command_data = undefined;
                }
            }
            message_queue.push({
                id:msg.id,
                in_guild: msg.guild ? true : false,
                content:msg.content,
                guild: msg.guild ? msg.guild.id : -4,
                channel: msg.guild ? msg.channel.id : -4,
                command: command_data == undefined ? false : true,
                command_data:command_data
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


app.get('/bot/guild/list', async (req,res)=>{
    const client: discord.Client = client_map[req.headers.authorization];
    if (client == undefined) {
        return res.status(401).json({status:'failure',reason:'Unauthorized'});
    }
    const guild_list = {};
    client.guilds.forEach((g:discord.Guild,k)=>{
        guild_list[k] = {
            id:g.id,
            name:g.name,
            icon:g.iconURL,
            system_channel:g.systemChannelID
        };
    });
    res.json(guild_list);
});

app.get('/bot/guild/members', async(req,res)=>{
    res.json({status:'Not yet implemented'});
});

app.get('/bot/guild/:guild/channels', async(req,res) => {
    const guild_id = req.params.guild;
    const client: discord.Client = client_map[req.headers.authorization];
    if (client == undefined) {
        return res.status(401).json({status:'failure',reason:'Unauthorized'})
    }
    const guild = client.guilds.get(guild_id);
    if (guild == null || guild == undefined) {
        return res.status(404).json({sttus:'failure',reason:'Guild not found'});
    }
    const channel_list = {}
    guild.channels.forEach((c,k)=>{
        channel_list[k] = {
            id:c.id,
            name:c.name,
            type:c.type
        };
    })
    res.json(channel_list);
});

app.get('/bot/guild/:guild/channels/:channel/info',(req,res)=>{
    const guild_id = req.params.guild;
    const channel_id = req.params.channel;

    const client: discord.Client = client_map[req.headers.authorization];

    if (client == undefined) {
        return res.status(401).json({status:'failure',reason:'Unauthorized'});
    }
    const guild = client.guilds.get(guild_id);
    if (guild == null || guild == undefined) {
        return res.status(404).json({sttus:'failure',reason:'Guild not found'});
    }
    const channel = guild.channels.find(c=>c.id==channel_id);
    if (channel == null || channel == undefined) {
        return res.status(404).json({status:'failure',reason:'Channel not found'});
    }

    return res.json({
        id:channel.id,
        name:channel.name
    })

});

app.post('/bot/guild/:guild/channels/:channel/send',(req,res)=>{
    const guild_id = req.params.guild;
    const channel_id = req.params.channel;

    const client: discord.Client = client_map[req.headers.authorization];
    if (client == undefined) {
        return res.status(401).json({status:'failure',reason:'Unauthorized'});
    }
    const guild = client.guilds.get(guild_id);
    if (guild == null || guild == undefined) {
        return res.status(404).json({sttus:'failure',reason:'Guild not found'});
    }
    const channel: discord.GuildChannel = guild.channels.find(c=>c.id==channel_id);
    if (channel == null || channel == undefined) {
        return res.status(404).json({status:'failure',reason:'Channel not found'});
    }

    const msg = req.body.msg;
    //@ts-ignore
    channel.send(msg);
    return res.json({status:'success'});
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