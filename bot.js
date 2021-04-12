const {readFileSync} = require('fs')
const {Telegraf} = require('telegraf')
const LocalSession = require('telegraf-session-local')
const token = readFileSync('token.txt.local', 'utf8').trim()
const bot = new Telegraf(token)
const property = 'session'
const WELCOME_HELP_PHONE="Pourquoi dois-je partager mon téléphone?"
const WELCOME_HELP_LOCATION="Pourquoi dois-je partager mon emplacement?"
const localSession = new LocalSession({
  database: 'session.json.local',
  property: 'session',
  storage: LocalSession.storageFileAsync,
  format: {
    serialize: (obj) => JSON.stringify(obj, null, 2), // null & 2 for pretty-formatted JSON
    deserialize: (str) => JSON.parse(str),
  },
  state: { messages: [] }
})

localSession.DB.then(DB => {
  console.log('Current LocalSession DB:', DB.value())
})

bot.use(localSession.middleware(property))
bot.command('/stats', (ctx) => {
  let msg = `Using session object from [Telegraf Context](http://telegraf.js.org/context.html) (\`ctx\`), named \`${property}\`\n`
  msg += `Database has \`${ctx[property].counter}\` messages from @${ctx.from.username || ctx.from.id}`
  ctx.replyWithMarkdown(msg)
})
bot.command('/remove', (ctx) => {
  ctx.replyWithMarkdown(`Removing session from database: \`${JSON.stringify(ctx[property])}\``)
  // Setting session to null, undefined or empty object/array will trigger removing it from database
  ctx[property] = null
})

function home(ctx) {
	console.log("home")
	if (ctx[property][ctx.from.id]==undefined || ctx[property][ctx.from.id].auth==0) {
		ctx.telegram.sendMessage(ctx.chat.id, 'Bienvenue à LaPrimaire.org 2022',
			{
				reply_markup: {
					inline_keyboard: [
						[{text: "S'authentifier", callback_data:"AUTH"}]
					]
				}
			}
		)
	} else {
		ctx.telegram.sendMessage(ctx.chat.id, 'Bienvenue à LaPrimaire.org 2022',
			{
				reply_markup: {
					inline_keyboard: [
						[
							{text: "Voir les candidats", callback_data:"SEE_CANDIDATES"},
							{text: "Chercher un candidat", callback_data:"SEARCH_CANDIDATE"}
						],
						[
							{text: "Se déclarer candidat", callback_data:"BECOME_CANDIDATE"},
							{text: "Se déloguer", callback_data:"LOGOUT"}
						]
					]
				}
			}
		)
	}
}

function showPhoto(ctx) {
	ctx.replyWithPhoto({url: 'https://fakeface.rest/thumb/view?'+ctx.update.update_id.toString()},
		{
			caption: "Candidat X",
			reply_markup: {
				inline_keyboard: [
					[{text: "< Précédent", callback_data:"PREVIOUS"},{text: "Suivant >", callback_data:"NEXT"},{text: "Retour", callback_data:"BACK"}]
				]
			}
		}
	)
}

bot.start((ctx)=>{
	home(ctx)
})

bot.action('PREVIOUS', (ctx)=>{
	ctx.deleteMessage();
	showPhoto(ctx);
})
bot.action('NEXT', (ctx)=>{
	ctx.deleteMessage();
	showPhoto(ctx);
})
bot.action('BACK', (ctx)=>{
	ctx.deleteMessage();
	home(ctx);
})

bot.action('BECOME_CANDIDATE', (ctx)=>{
	ctx.deleteMessage();
	ctx.reply('Envoyez-nous la vidéo de présentation de votre candidature en utilisant la fonctionalité intégrée de Telegram.',{
		reply_markup: {
			inline_keyboard: [
					[{text: "Comment puis-je envoyer ma vidéo?", callback_data: "HELP_VIDEO"}]
			]
		}
	})
})

bot.on('video_note', (ctx)=>{
	ctx.telegram.sendMessage(ctx.chat.id,'Bien reçu! Votre vidéo de candidature a bien été enregistrée.')
	home(ctx)
})

bot.action('SEE_CANDIDATES', (ctx)=>{
	ctx.deleteMessage();
	showPhoto(ctx);
})

bot.action('AUTH', (ctx)=>{
	console.log("AUTH")
	ctx.deleteMessage();
	if (ctx[property][ctx.from.id]==undefined) {
		ctx[property][ctx.from.id]={'auth': 0}
	}
	ctx[property][ctx.from.id].auth = ctx[property][ctx.from.id].auth || 1;
	ctx.telegram.sendMessage(ctx.chat.id,'Quel est le numéro de téléphone associé à votre compte Telegram? Cliquez le bouton ci-dessous pour le partager.',
		{ 
			reply_markup: { 
				keyboard: [
					[{text: "📲 Partager mon numéro de téléphone", request_contact: true}],
					[{text: WELCOME_HELP_PHONE}]
				] 
			} 
		}
	);
})

bot.hears(WELCOME_HELP_PHONE, (ctx)=>{ ctx.reply("Le numéro de téléphone attaché à votre compte Telegram est un des éléments que nous utilisons pour éviter la fraude. Ne vous inquiétez pas: votre numéro ne sera pas partagé et vous ne recevrez jamais d'appel de notre part!"); })
bot.hears(WELCOME_HELP_LOCATION, (ctx)=>{ ctx.reply("Votre emplacement n'est utilisé qu'à des fins de lutte contre la fraude. Celui-ci ne sera partagé à personne."); })


bot.on('contact', (ctx)=> {
	ctx.reply("Merci! A présent, merci de nous partager votre emplacement actuel 🙏 (cela ne peut être fait que depuis l'app Telegram sur votre téléphone)", 
		{
			reply_markup: { 
				keyboard: [
					[{text: '📲 Partager ma location', request_location: true}],
					[{text: WELCOME_HELP_LOCATION}]
				] 
			} 
		}
	);
})

bot.on('location', (ctx)=> {
	ctx.telegram.sendMessage(ctx.chat.id,'merci!', { reply_markup: { hide_keyboard:true } })
	home(ctx);
})

bot.action('LOGOUT', (ctx)=>{
	ctx.deleteMessage();
	ctx[property][ctx.from.id].auth = 0;
	home(ctx);
})


bot.launch()
