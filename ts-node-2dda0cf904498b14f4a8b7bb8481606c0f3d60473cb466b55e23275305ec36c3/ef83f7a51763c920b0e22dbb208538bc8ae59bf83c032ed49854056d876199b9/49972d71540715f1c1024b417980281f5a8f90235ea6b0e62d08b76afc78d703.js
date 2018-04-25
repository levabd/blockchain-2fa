"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("../../../config/env");
const WebSocket = require("ws");
const changeCase = require("change-case");
const helpers_1 = require("../../../services/helpers/helpers");
const redis = require("redis");
const Promisefy = require("bluebird");
const constants_1 = require("../../../config/constants");
const DICT = {
    ru: {
        not_verified: 'Пользователь не прошёл верификацию в мобильном приложении',
        telegram_bot_unregistered: 'Пользователь не зарегистрировался у боте телеграмма @BlockchainTfaBot',
        error_decode_user_bc: 'Ошибка при получении пользователя из блокчейна',
        unknown_error: 'Неизвестная ошибка'
    },
    en: {
        not_verified: 'User is not verified',
        telegram_bot_unregistered: 'User select telegram, but not registered in it yet',
        error_decode_user_bc: 'Cant decode user',
        unknown_error: 'User is not verified'
    },
};
class ApiController {
    constructor(tfaTF, kaztelTF, egovTF) {
        this.tfaTF = tfaTF;
        this.kaztelTF = kaztelTF;
        this.egovTF = egovTF;
        Promisefy.promisifyAll(redis);
        const redisURL = `redis://${env_1.EnvConfig.REDIS_HOST}:${env_1.EnvConfig.REDIS_PORT}`;
        this.redisClient = redis.createClient({ url: redisURL });
    }
    transformLog(log, service) {
        const fieldsToHandle = Object.keys(log);
        let obj = {};
        for (let f of fieldsToHandle) {
            if (f == 'Status' || f == 'ExpiredAt' || f == 'Method' || f == 'ActionTime') {
                continue;
            }
            obj[changeCase.snakeCase(f)] = log[f];
        }
        obj['service'] = service;
        return obj;
    }
    getLatestCode(user) {
        let sendCodeArrayKeysSorted = [];
        const userKeys = Object.keys(user.Logs);
        if (userKeys.length === 0) {
            return { status: 'no_send_codes' };
        }
        const currentTimestamp = (new Date()).getTime() / 1000;
        const keysLength = userKeys.length - 1;
        let sendCodeArrayKeys = [];
        let validCodeArrayKeys = [];
        for (let i = 0; i <= userKeys.length; i++) {
            const log = user.Logs[userKeys[i]];
            if (!log.Status) {
                continue;
            }
            if (log.Status === constants_1.SEND_CODE || log.Status === constants_1.RESEND_CODE) {
                if (currentTimestamp <= log.ExpiredAt && log.Method === 'push') {
                    sendCodeArrayKeys.push(parseInt(userKeys[i], 10));
                }
            }
            if (log.Status === constants_1.VALID || log.Status === constants_1.REJECT) {
                validCodeArrayKeys.push(parseInt(userKeys[i], 10));
            }
            if (i !== keysLength) {
                continue;
            }
            if (sendCodeArrayKeys.length === 0) {
                return { status: 'no_send_codes' };
            }
            sendCodeArrayKeysSorted = sendCodeArrayKeys.sort(helpers_1.sortNumber);
            const latestCodeIndex = sendCodeArrayKeysSorted.length === 1
                ? sendCodeArrayKeysSorted[0]
                : sendCodeArrayKeysSorted[sendCodeArrayKeysSorted.length - 1];
            const latestLog = user.Logs[latestCodeIndex];
            if (!validCodeArrayKeys.length) {
                return { status: 'success', log: latestLog };
            }
            const validKeysLength = validCodeArrayKeys.length - 1;
            for (let j = 0; j < validCodeArrayKeys.length; j++) {
                const logValid = user.Logs[validCodeArrayKeys[j]];
                if (logValid.Code === latestLog.Code) {
                    return { status: 'no_code_used' };
                }
                if (j === validKeysLength) {
                    return { status: 'success', log: latestLog };
                }
            }
        }
    }
    getMessage(lang, locale = 'unknown_error') {
        let _lang = lang;
        if (!DICT[_lang]) {
            _lang = 'en';
        }
        return DICT[_lang][locale] || DICT[_lang]['unknown_error'];
    }
    getUserNotFoundMessage(lang) {
        return lang === 'ru' ? 'Пользователь не найден' : 'User not found';
    }
    openWsConnection(addresses) {
        console.log('openWsConnection', `ws:${env_1.EnvConfig.VALIDATOR_REST_API_USER}:${env_1.EnvConfig.VALIDATOR_REST_API_PASS}@${env_1.EnvConfig.VALIDATOR_REST_API}/subscriptions`);
        let ws = new WebSocket(`ws:${env_1.EnvConfig.VALIDATOR_REST_API_USER}:${env_1.EnvConfig.VALIDATOR_REST_API_PASS}@${env_1.EnvConfig.VALIDATOR_REST_API}/subscriptions`);
        ws.onopen = () => {
            ws.send(JSON.stringify({
                'action': 'subscribe',
                'address_prefixes': addresses
            }));
        };
        ws.onclose = () => {
            try {
                ws.send(JSON.stringify({
                    'action': 'unsubscribe'
                }));
            }
            catch (e) {
                console.log('e', e);
            }
        };
        console.log('return', 'return');
        return ws;
    }
    getUser(phoneNumber, service) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!phoneNumber) {
                return null;
            }
            if (phoneNumber.charAt(0) === '+') {
                phoneNumber = phoneNumber.substring(1);
            }
            phoneNumber = phoneNumber.substr(phoneNumber.length - 10);
            const phoneNumberSeven = `7${phoneNumber}`;
            const phoneNumberEight = `8${phoneNumber}`;
            let user = null;
            try {
                user = yield this._getUser(phoneNumberSeven, service);
                return user;
            }
            catch (e) {
                console.log(`Cant find user with phone number: ${phoneNumberSeven}. Trying to find with number: ${phoneNumberEight}`);
                try {
                    user = yield this._getUser(phoneNumberEight, service);
                    return user;
                }
                catch (e) {
                    console.log(`Cant find user with phone number: ${phoneNumberEight}. Return null`);
                    return null;
                }
            }
        });
    }
    _getUser(phoneNumber, service) {
        return __awaiter(this, void 0, void 0, function* () {
            let user;
            try {
                switch (service) {
                    case 'kaztel':
                        user = yield this.kaztelTF.getUser(phoneNumber);
                        break;
                    case 'egov':
                        user = yield this.egovTF.getUser(phoneNumber);
                        break;
                    default:
                        user = yield this.tfaTF.getStateByPhoneNumber(phoneNumber);
                        break;
                }
                if (user.PhoneNumber == '') {
                    return null;
                }
            }
            catch (e) {
                return null;
            }
            return user;
        });
    }
}
exports.ApiController = ApiController;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiL2hvbWUvcGVzaGtvdi9kZXYvcHJvamVjdHMvYmxvY2tjaGFpbi0yZmEtYmFja2VuZC9zcmMvbW9kdWxlcy9hcGkvY29udHJvbGxzZXJzL2NvbnRyb2xsZXIudHMiLCJzb3VyY2VzIjpbIi9ob21lL3Blc2hrb3YvZGV2L3Byb2plY3RzL2Jsb2NrY2hhaW4tMmZhLWJhY2tlbmQvc3JjL21vZHVsZXMvYXBpL2NvbnRyb2xsc2Vycy9jb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFJQSw2Q0FBOEM7QUFDOUMsZ0NBQWdDO0FBQ2hDLDBDQUEwQztBQUMxQywrREFBNkQ7QUFDN0QsK0JBQStCO0FBQy9CLHNDQUFzQztBQUN0Qyx5REFBZ0Y7QUFFaEYsTUFBTSxJQUFJLEdBQUc7SUFDVCxFQUFFLEVBQUU7UUFDQSxZQUFZLEVBQUUsMkRBQTJEO1FBQ3pFLHlCQUF5QixFQUFFLHVFQUF1RTtRQUNsRyxvQkFBb0IsRUFBRSxnREFBZ0Q7UUFDdEUsYUFBYSxFQUFFLG9CQUFvQjtLQUN0QztJQUNELEVBQUUsRUFBRTtRQUNBLFlBQVksRUFBRSxzQkFBc0I7UUFDcEMseUJBQXlCLEVBQUUsb0RBQW9EO1FBQy9FLG9CQUFvQixFQUFFLGtCQUFrQjtRQUN4QyxhQUFhLEVBQUUsc0JBQXNCO0tBQ3hDO0NBQ0osQ0FBQztBQUVGO0lBRUksWUFBbUIsS0FBMkIsRUFDM0IsUUFBaUMsRUFDakMsTUFBNkI7UUFGN0IsVUFBSyxHQUFMLEtBQUssQ0FBc0I7UUFDM0IsYUFBUSxHQUFSLFFBQVEsQ0FBeUI7UUFDakMsV0FBTSxHQUFOLE1BQU0sQ0FBdUI7UUFDNUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM5QixNQUFNLFFBQVEsR0FBRyxXQUFXLGVBQVMsQ0FBQyxVQUFVLElBQUksZUFBUyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQzNFLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUFDLEdB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Q0FBQztnQkFDaEIsQ0FBQztZQUNMLENBQUM7WUFBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNULE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDaEIsQ0FBQztZQUVELE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDaEIsQ0FBQztLQUFBO0NBQ0o7QUF2TUQsc0NBdU1DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtQb3N0Q2xpZW50VXNlckRUT30gZnJvbSAnLi4vLi4vc2hhcmVkL21vZGVscy9kdG8vcG9zdC5rYXp0ZWwudXNlci5kdG8nO1xuaW1wb3J0IHtLYXp0ZWxUcmFuc2FjdGlvbkZhbWlseX0gZnJvbSAnLi4vLi4vc2hhcmVkL2ZhbWlsaWVzL2thenRlbC50cmFuc2FjdGlvbi5mYW1pbHknO1xuaW1wb3J0IHtUZmFUcmFuc2FjdGlvbkZhbWlseX0gZnJvbSAnLi4vLi4vc2hhcmVkL2ZhbWlsaWVzL3RmYS50cmFuc2FjdGlvbi5mYW1pbHknO1xuaW1wb3J0IHtFZ292VHJhbnNhY3Rpb25GYW1pbHl9IGZyb20gJy4uLy4uL3NoYXJlZC9mYW1pbGllcy9lZ292LnRyYW5zYWN0aW9uLmZhbWlseSc7XG5pbXBvcnQge0VudkNvbmZpZ30gZnJvbSAnLi4vLi4vLi4vY29uZmlnL2Vudic7XG5pbXBvcnQgKiBhcyBXZWJTb2NrZXQgZnJvbSAnd3MnO1xuaW1wb3J0ICogYXMgY2hhbmdlQ2FzZSBmcm9tICdjaGFuZ2UtY2FzZSc7XG5pbXBvcnQge3NvcnROdW1iZXJ9IGZyb20gJy4uLy4uLy4uL3NlcnZpY2VzL2hlbHBlcnMvaGVscGVycyc7XG5pbXBvcnQgKiBhcyByZWRpcyBmcm9tICdyZWRpcyc7XG5pbXBvcnQgKiBhcyBQcm9taXNlZnkgZnJvbSAnYmx1ZWJpcmQnO1xuaW1wb3J0IHtSRUpFQ1QsIFJFU0VORF9DT0RFLCBTRU5EX0NPREUsIFZBTElEfSBmcm9tICcuLi8uLi8uLi9jb25maWcvY29uc3RhbnRzJztcblxuY29uc3QgRElDVCA9IHtcbiAgICBydToge1xuICAgICAgICBub3RfdmVyaWZpZWQ6ICfQn9C+0LvRjNC30L7QstCw0YLQtdC70Ywg0L3QtSDQv9GA0L7RiNGR0Lsg0LLQtdGA0LjRhNC40LrQsNGG0LjRjiDQsiDQvNC+0LHQuNC70YzQvdC+0Lwg0L/RgNC40LvQvtC20LXQvdC40LgnLFxuICAgICAgICB0ZWxlZ3JhbV9ib3RfdW5yZWdpc3RlcmVkOiAn0J/QvtC70YzQt9C+0LLQsNGC0LXQu9GMINC90LUg0LfQsNGA0LXQs9C40YHRgtGA0LjRgNC+0LLQsNC70YHRjyDRgyDQsdC+0YLQtSDRgtC10LvQtdCz0YDQsNC80LzQsCBAQmxvY2tjaGFpblRmYUJvdCcsXG4gICAgICAgIGVycm9yX2RlY29kZV91c2VyX2JjOiAn0J7RiNC40LHQutCwINC/0YDQuCDQv9C+0LvRg9GH0LXQvdC40Lgg0L/QvtC70YzQt9C+0LLQsNGC0LXQu9GPINC40Lcg0LHQu9C+0LrRh9C10LnQvdCwJyxcbiAgICAgICAgdW5rbm93bl9lcnJvcjogJ9Cd0LXQuNC30LLQtdGB0YLQvdCw0Y8g0L7RiNC40LHQutCwJ1xuICAgIH0sXG4gICAgZW46IHtcbiAgICAgICAgbm90X3ZlcmlmaWVkOiAnVXNlciBpcyBub3QgdmVyaWZpZWQnLFxuICAgICAgICB0ZWxlZ3JhbV9ib3RfdW5yZWdpc3RlcmVkOiAnVXNlciBzZWxlY3QgdGVsZWdyYW0sIGJ1dCBub3QgcmVnaXN0ZXJlZCBpbiBpdCB5ZXQnLFxuICAgICAgICBlcnJvcl9kZWNvZGVfdXNlcl9iYzogJ0NhbnQgZGVjb2RlIHVzZXInLFxuICAgICAgICB1bmtub3duX2Vycm9yOiAnVXNlciBpcyBub3QgdmVyaWZpZWQnXG4gICAgfSxcbn07XG5cbmV4cG9ydCBjbGFzcyBBcGlDb250cm9sbGVyIHtcbiAgICByZWRpc0NsaWVudDogYW55O1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyB0ZmFURjogVGZhVHJhbnNhY3Rpb25GYW1pbHksXG4gICAgICAgICAgICAgICAgcHVibGljIGthenRlbFRGOiBLYXp0ZWxUcmFuc2FjdGlvbkZhbWlseSxcbiAgICAgICAgICAgICAgICBwdWJsaWMgZWdvdlRGOiBFZ292VHJhbnNhY3Rpb25GYW1pbHksKSB7XG4gICAgICAgIFByb21pc2VmeS5wcm9taXNpZnlBbGwocmVkaXMpO1xuICAgICAgICBjb25zdCByZWRpc1VSTCA9IGByZWRpczovLyR7RW52Q29uZmlnLlJFRElTX0hPU1R9OiR7RW52Q29uZmlnLlJFRElTX1BPUlR9YDtcbiAgICAgICAgdGhpcy5yZWRpc0NsaWVudCA9IHJlZGlzLmNyZWF0ZUNsaWVudCh7dXJsOiByZWRpc1VSTH0pO1xuICAgIH1cblxuICAgIHRyYW5zZm9ybUxvZyhsb2c6IGFueSwgc2VydmljZTogc3RyaW5nKTogb2JqZWN0IHtcbiAgICAgICAgY29uc3QgZmllbGRzVG9IYW5kbGUgPSBPYmplY3Qua2V5cyhsb2cpO1xuICAgICAgICBsZXQgb2JqID0ge307XG4gICAgICAgIGZvciAobGV0IGYgb2YgZmllbGRzVG9IYW5kbGUpIHtcbiAgICAgICAgICAgIGlmIChmID09ICdTdGF0dXMnIHx8IGYgPT0gJ0V4cGlyZWRBdCcgfHwgZiA9PSAnTWV0aG9kJyB8fCBmID09ICdBY3Rpb25UaW1lJykge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb2JqW2NoYW5nZUNhc2Uuc25ha2VDYXNlKGYpXSA9IGxvZ1tmXTtcbiAgICAgICAgfVxuICAgICAgICBvYmpbJ3NlcnZpY2UnXSA9IHNlcnZpY2U7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgZ2V0TGF0ZXN0Q29kZSh1c2VyOiBhbnkpOiBhbnkge1xuXG4gICAgICAgIGxldCBzZW5kQ29kZUFycmF5S2V5c1NvcnRlZCA9IFtdO1xuICAgICAgICBjb25zdCB1c2VyS2V5cyA9IE9iamVjdC5rZXlzKHVzZXIuTG9ncyk7XG5cbiAgICAgICAgaWYgKHVzZXJLZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHtzdGF0dXM6ICdub19zZW5kX2NvZGVzJ307XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjdXJyZW50VGltZXN0YW1wID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKSAvIDEwMDA7XG4gICAgICAgIGNvbnN0IGtleXNMZW5ndGggPSB1c2VyS2V5cy5sZW5ndGggLSAxO1xuICAgICAgICBsZXQgc2VuZENvZGVBcnJheUtleXMgPSBbXTtcbiAgICAgICAgbGV0IHZhbGlkQ29kZUFycmF5S2V5cyA9IFtdO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IHVzZXJLZXlzLmxlbmd0aDsgaSsrKSB7XG5cbiAgICAgICAgICAgIGNvbnN0IGxvZyA9IHVzZXIuTG9nc1t1c2VyS2V5c1tpXV07XG5cbiAgICAgICAgICAgIGlmICghbG9nLlN0YXR1cykge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobG9nLlN0YXR1cyA9PT0gU0VORF9DT0RFIHx8IGxvZy5TdGF0dXMgPT09IFJFU0VORF9DT0RFKSB7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRUaW1lc3RhbXAgPD0gbG9nLkV4cGlyZWRBdCAmJiBsb2cuTWV0aG9kID09PSAncHVzaCcpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VuZENvZGVBcnJheUtleXMucHVzaChwYXJzZUludCh1c2VyS2V5c1tpXSwgMTApKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobG9nLlN0YXR1cyA9PT0gVkFMSUR8fGxvZy5TdGF0dXMgPT09IFJFSkVDVCkge1xuICAgICAgICAgICAgICAgIHZhbGlkQ29kZUFycmF5S2V5cy5wdXNoKHBhcnNlSW50KHVzZXJLZXlzW2ldLCAxMCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoaSAhPT0ga2V5c0xlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc2VuZENvZGVBcnJheUtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtzdGF0dXM6ICdub19zZW5kX2NvZGVzJ307XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNlbmRDb2RlQXJyYXlLZXlzU29ydGVkID0gc2VuZENvZGVBcnJheUtleXMuc29ydChzb3J0TnVtYmVyKTtcblxuICAgICAgICAgICAgY29uc3QgbGF0ZXN0Q29kZUluZGV4ID0gc2VuZENvZGVBcnJheUtleXNTb3J0ZWQubGVuZ3RoID09PSAxXG4gICAgICAgICAgICAgICAgPyBzZW5kQ29kZUFycmF5S2V5c1NvcnRlZFswXVxuICAgICAgICAgICAgICAgIDogc2VuZENvZGVBcnJheUtleXNTb3J0ZWRbc2VuZENvZGVBcnJheUtleXNTb3J0ZWQubGVuZ3RoIC0gMV07XG5cbiAgICAgICAgICAgIGNvbnN0IGxhdGVzdExvZyA9IHVzZXIuTG9nc1tsYXRlc3RDb2RlSW5kZXhdO1xuXG4gICAgICAgICAgICBpZiAoIXZhbGlkQ29kZUFycmF5S2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge3N0YXR1czogJ3N1Y2Nlc3MnLCBsb2c6IGxhdGVzdExvZ307XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHZhbGlkS2V5c0xlbmd0aCA9IHZhbGlkQ29kZUFycmF5S2V5cy5sZW5ndGggLSAxO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHZhbGlkQ29kZUFycmF5S2V5cy5sZW5ndGg7IGorKykge1xuXG4gICAgICAgICAgICAgICAgY29uc3QgbG9nVmFsaWQgPSB1c2VyLkxvZ3NbdmFsaWRDb2RlQXJyYXlLZXlzW2pdXTtcblxuICAgICAgICAgICAgICAgIGlmIChsb2dWYWxpZC5Db2RlID09PSBsYXRlc3RMb2cuQ29kZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge3N0YXR1czogJ25vX2NvZGVfdXNlZCd9O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChqID09PSB2YWxpZEtleXNMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtzdGF0dXM6ICdzdWNjZXNzJywgbG9nOiBsYXRlc3RMb2d9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldE1lc3NhZ2UobGFuZzogc3RyaW5nLCBsb2NhbGUgPSAndW5rbm93bl9lcnJvcicpOiBzdHJpbmcge1xuICAgICAgICBsZXQgX2xhbmcgPSBsYW5nO1xuICAgICAgICBpZiAoIURJQ1RbX2xhbmddKSB7XG4gICAgICAgICAgICBfbGFuZyA9ICdlbic7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gRElDVFtfbGFuZ11bbG9jYWxlXSB8fCBESUNUW19sYW5nXVsndW5rbm93bl9lcnJvciddO1xuICAgIH1cblxuICAgIGdldFVzZXJOb3RGb3VuZE1lc3NhZ2UobGFuZzogc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBsYW5nID09PSAncnUnID8gJ9Cf0L7Qu9GM0LfQvtCy0LDRgtC10LvRjCDQvdC1INC90LDQudC00LXQvScgOiAnVXNlciBub3QgZm91bmQnO1xuICAgIH1cblxuICAgIG9wZW5Xc0Nvbm5lY3Rpb24oYWRkcmVzc2VzOiBzdHJpbmdbXSk6IGFueSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdvcGVuV3NDb25uZWN0aW9uJywgYHdzOiR7RW52Q29uZmlnLlZBTElEQVRPUl9SRVNUX0FQSV9VU0VSfToke0VudkNvbmZpZy5WQUxJREFUT1JfUkVTVF9BUElfUEFTU31AJHtFbnZDb25maWcuVkFMSURBVE9SX1JFU1RfQVBJfS9zdWJzY3JpcHRpb25zYCk7XG4gICAgICAgIGxldCB3cyA9IG5ldyBXZWJTb2NrZXQoYHdzOiR7RW52Q29uZmlnLlZBTElEQVRPUl9SRVNUX0FQSV9VU0VSfToke0VudkNvbmZpZy5WQUxJREFUT1JfUkVTVF9BUElfUEFTU31AJHtFbnZDb25maWcuVkFMSURBVE9SX1JFU1RfQVBJfS9zdWJzY3JpcHRpb25zYCk7XG4gICAgICAgIHdzLm9ub3BlbiA9ICgpID0+IHtcbiAgICAgICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICdhY3Rpb24nOiAnc3Vic2NyaWJlJyxcbiAgICAgICAgICAgICAgICAnYWRkcmVzc19wcmVmaXhlcyc6IGFkZHJlc3Nlc1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9O1xuICAgICAgICB3cy5vbmNsb3NlID0gKCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgJ2FjdGlvbic6ICd1bnN1YnNjcmliZSdcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlJywgZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGNvbnNvbGUubG9nKCdyZXR1cm4nLCAncmV0dXJuJyk7XG5cbiAgICAgICAgcmV0dXJuIHdzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB1c2VyIHdpdGggYnkgdHJhbnNhY3Rpb24gZmEsaWx5IG5hbWVcbiAgICAgKiAgd2UgbmVlZCB0byBjaGVjayA3NzA1MDAwMDAwMFxuICAgICAqICAgICAgICAgYW5kIGNoZWNrIDg3MDUwMDAwMDAwXG4gICAgICogcGhvbmUgbnVtYmVyIGNhbiBzdGFydCB3aXRoIDggb3IgN1xuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBob25lTnVtYmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNlcnZpY2VcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZTxQb3N0Q2xpZW50VXNlckRUTyB8IG51bGw+fVxuICAgICAqL1xuICAgIGFzeW5jIGdldFVzZXIocGhvbmVOdW1iZXI6IHN0cmluZywgc2VydmljZTogc3RyaW5nKTogUHJvbWlzZTxQb3N0Q2xpZW50VXNlckRUTyB8IG51bGw+IHtcbiAgICAgICAgaWYgKCFwaG9uZU51bWJlcil7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGhvbmVOdW1iZXIuY2hhckF0KDApID09PSAnKycpIHtcbiAgICAgICAgICAgIHBob25lTnVtYmVyID0gcGhvbmVOdW1iZXIuc3Vic3RyaW5nKDEpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHdlIG5lZWQgdG8gY2hlY2sgNzcwNTAwMDAwMDBcbiAgICAgICAgLy8gICAgICAgIGFuZCBjaGVjayA4NzA1MDAwMDAwMFxuICAgICAgICAvLyBwaG9uZSBudW1iZXIgY2FuIHN0YXJ0IHdpdGggOCBvciA3XG4gICAgICAgIHBob25lTnVtYmVyID0gcGhvbmVOdW1iZXIuc3Vic3RyKHBob25lTnVtYmVyLmxlbmd0aCAtIDEwKTtcblxuICAgICAgICAvLyBmaXJzdCBjaGVjayB3aXRoIDdcbiAgICAgICAgY29uc3QgcGhvbmVOdW1iZXJTZXZlbiA9IGA3JHtwaG9uZU51bWJlcn1gO1xuICAgICAgICBjb25zdCBwaG9uZU51bWJlckVpZ2h0ID0gYDgke3Bob25lTnVtYmVyfWA7XG4gICAgICAgIGxldCB1c2VyID0gbnVsbDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHVzZXIgPSBhd2FpdCB0aGlzLl9nZXRVc2VyKHBob25lTnVtYmVyU2V2ZW4sIHNlcnZpY2UpO1xuICAgICAgICAgICAgcmV0dXJuIHVzZXI7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBDYW50IGZpbmQgdXNlciB3aXRoIHBob25lIG51bWJlcjogJHtwaG9uZU51bWJlclNldmVufS4gVHJ5aW5nIHRvIGZpbmQgd2l0aCBudW1iZXI6ICR7cGhvbmVOdW1iZXJFaWdodH1gKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdXNlciA9IGF3YWl0IHRoaXMuX2dldFVzZXIocGhvbmVOdW1iZXJFaWdodCwgc2VydmljZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVzZXI7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYENhbnQgZmluZCB1c2VyIHdpdGggcGhvbmUgbnVtYmVyOiAke3Bob25lTnVtYmVyRWlnaHR9LiBSZXR1cm4gbnVsbGApO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHVzZXIgYnkgcGhvbmUgbnVtYmVyIGFuZCB0cmFuc2FjdGlvbiBmYW1pbHkgbmFtZVxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBob25lTnVtYmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNlcnZpY2VcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZTxQb3N0Q2xpZW50VXNlckRUTyB8IG51bGw+fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgcHJpdmF0ZSBhc3luYyBfZ2V0VXNlcihwaG9uZU51bWJlcjogc3RyaW5nLCBzZXJ2aWNlOiBzdHJpbmcpOiBQcm9taXNlPFBvc3RDbGllbnRVc2VyRFRPIHwgbnVsbD4ge1xuICAgICAgICBsZXQgdXNlcjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHN3aXRjaCAoc2VydmljZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ2thenRlbCc6XG4gICAgICAgICAgICAgICAgICAgIHVzZXIgPSBhd2FpdCB0aGlzLmthenRlbFRGLmdldFVzZXIocGhvbmVOdW1iZXIpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdlZ292JzpcbiAgICAgICAgICAgICAgICAgICAgdXNlciA9IGF3YWl0IHRoaXMuZWdvdlRGLmdldFVzZXIocGhvbmVOdW1iZXIpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICB1c2VyID0gYXdhaXQgdGhpcy50ZmFURi5nZXRTdGF0ZUJ5UGhvbmVOdW1iZXIocGhvbmVOdW1iZXIpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh1c2VyLlBob25lTnVtYmVyID09ICcnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHVzZXI7XG4gICAgfVxufSJdfQ==