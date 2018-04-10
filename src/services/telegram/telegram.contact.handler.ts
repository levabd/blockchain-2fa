const helper = require('./helpers');
// const Extra = require('telegraf/extra')
const Markup = require('telegraf/markup');
const console = require('tracer').colorConsole();
const format = require('util').format;

export const telegramContactHandler = (User, Messages) => {
    let route = (ctx) => {
        if (ctx.message.contact.user_id !== ctx.from.id) {
            console.log('contact number is not number of session user');
            let message = format(Messages.notyournumber, helper.getUserFullName(ctx.from));
            ctx.reply(message);
            return;
        }

        let newUser = new User({
            chatId: ctx.from.id,
            number: helper.modifyPhoneNumber(ctx.message.contact.phone_number),
            title: helper.getUserFullName(ctx.message.contact)
        });

        return newUser.save()
            .then(() => {
                console.log('user registered');
                let message = format(Messages.registered, helper.getUserFullName(ctx.from));
                ctx.reply(message, Markup.removeKeyboard().extra());
            })
            .catch(console.log);
    };

    return {route};
};
