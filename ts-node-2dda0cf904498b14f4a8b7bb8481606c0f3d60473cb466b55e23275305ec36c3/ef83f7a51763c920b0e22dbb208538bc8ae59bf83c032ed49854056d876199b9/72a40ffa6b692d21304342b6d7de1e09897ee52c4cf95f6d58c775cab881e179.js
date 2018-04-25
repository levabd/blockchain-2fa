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
const changeCase = require("change-case");
const helpers_1 = require("../../../services/helpers/helpers");
const redis = require("redis");
const Promisefy = require("bluebird");
const constants_1 = require("../../../config/constants");
const WebSocket = require('ws');
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
        this.endpoint = `ws://${env_1.EnvConfig.VALIDATOR_REST_API_USER}:
        ${env_1.EnvConfig.VALIDATOR_REST_API_PASS}@${env_1.EnvConfig.VALIDATOR_REST_API_WS}/sawtooth-ws/subscriptions`;
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
        let ws = new WebSocket(this.endpoint);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiL2hvbWUvcGVzaGtvdi9kZXYvcHJvamVjdHMvYmxvY2tjaGFpbi0yZmEtYmFja2VuZC9zcmMvbW9kdWxlcy9hcGkvY29udHJvbGxzZXJzL2NvbnRyb2xsZXIudHMiLCJzb3VyY2VzIjpbIi9ob21lL3Blc2hrb3YvZGV2L3Byb2plY3RzL2Jsb2NrY2hhaW4tMmZhLWJhY2tlbmQvc3JjL21vZHVsZXMvYXBpL2NvbnRyb2xsc2Vycy9jb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFJQSw2Q0FBOEM7QUFFOUMsMENBQTBDO0FBQzFDLCtEQUE2RDtBQUM3RCwrQkFBK0I7QUFDL0Isc0NBQXNDO0FBQ3RDLHlEQUFnRjtBQUNoRixNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFaEMsTUFBTSxJQUFJLEdBQUc7SUFDVCxFQUFFLEVBQUU7UUFDQSxZQUFZLEVBQUUsMkRBQTJEO1FBQ3pFLHlCQUF5QixFQUFFLHVFQUF1RTtRQUNsRyxvQkFBb0IsRUFBRSxnREFBZ0Q7UUFDdEUsYUFBYSxFQUFFLG9CQUFvQjtLQUN0QztJQUNELEVBQUUsRUFBRTtRQUNBLFlBQVksRUFBRSxzQkFBc0I7UUFDcEMseUJBQXlCLEVBQUUsb0RBQW9EO1FBQy9FLG9CQUFvQixFQUFFLGtCQUFrQjtRQUN4QyxhQUFhLEVBQUUsc0JBQXNCO0tBQ3hDO0NBQ0osQ0FBQztBQUVGO0lBR0ksWUFBbUIsS0FBMkIsRUFDM0IsUUFBaUMsRUFDakMsTUFBNkI7UUFGN0IsVUFBSyxHQUFMLEtBQUssQ0FBc0I7UUFDM0IsYUFBUSxHQUFSLFFBQVEsQ0FBeUI7UUFDakMsV0FBTSxHQUFOLE1BQU0sQ0FBdUI7UUFDNUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM5QixNQUFNLFFBQVEsR0FBRyxXQUFXLGVBQVMsQ0FBQyxVQUFVLElBQUksZUFBUyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQzNFLElBQUksQ0FBQyxXQUFX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O1lBQ2hCLENBQUM7WUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ2hCLENBQUM7S0FBQTtDQUNKO0FBeE1ELHNDQXdNQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7UG9zdENsaWVudFVzZXJEVE99IGZyb20gJy4uLy4uL3NoYXJlZC9tb2RlbHMvZHRvL3Bvc3Qua2F6dGVsLnVzZXIuZHRvJztcbmltcG9ydCB7S2F6dGVsVHJhbnNhY3Rpb25GYW1pbHl9IGZyb20gJy4uLy4uL3NoYXJlZC9mYW1pbGllcy9rYXp0ZWwudHJhbnNhY3Rpb24uZmFtaWx5JztcbmltcG9ydCB7VGZhVHJhbnNhY3Rpb25GYW1pbHl9IGZyb20gJy4uLy4uL3NoYXJlZC9mYW1pbGllcy90ZmEudHJhbnNhY3Rpb24uZmFtaWx5JztcbmltcG9ydCB7RWdvdlRyYW5zYWN0aW9uRmFtaWx5fSBmcm9tICcuLi8uLi9zaGFyZWQvZmFtaWxpZXMvZWdvdi50cmFuc2FjdGlvbi5mYW1pbHknO1xuaW1wb3J0IHtFbnZDb25maWd9IGZyb20gJy4uLy4uLy4uL2NvbmZpZy9lbnYnO1xuLy8gaW1wb3J0ICogYXMgV2ViU29ja2V0IGZyb20gJ3dzJztcbmltcG9ydCAqIGFzIGNoYW5nZUNhc2UgZnJvbSAnY2hhbmdlLWNhc2UnO1xuaW1wb3J0IHtzb3J0TnVtYmVyfSBmcm9tICcuLi8uLi8uLi9zZXJ2aWNlcy9oZWxwZXJzL2hlbHBlcnMnO1xuaW1wb3J0ICogYXMgcmVkaXMgZnJvbSAncmVkaXMnO1xuaW1wb3J0ICogYXMgUHJvbWlzZWZ5IGZyb20gJ2JsdWViaXJkJztcbmltcG9ydCB7UkVKRUNULCBSRVNFTkRfQ09ERSwgU0VORF9DT0RFLCBWQUxJRH0gZnJvbSAnLi4vLi4vLi4vY29uZmlnL2NvbnN0YW50cyc7XG5jb25zdCBXZWJTb2NrZXQgPSByZXF1aXJlKCd3cycpO1xuXG5jb25zdCBESUNUID0ge1xuICAgIHJ1OiB7XG4gICAgICAgIG5vdF92ZXJpZmllZDogJ9Cf0L7Qu9GM0LfQvtCy0LDRgtC10LvRjCDQvdC1INC/0YDQvtGI0ZHQuyDQstC10YDQuNGE0LjQutCw0YbQuNGOINCyINC80L7QsdC40LvRjNC90L7QvCDQv9GA0LjQu9C+0LbQtdC90LjQuCcsXG4gICAgICAgIHRlbGVncmFtX2JvdF91bnJlZ2lzdGVyZWQ6ICfQn9C+0LvRjNC30L7QstCw0YLQtdC70Ywg0L3QtSDQt9Cw0YDQtdCz0LjRgdGC0YDQuNGA0L7QstCw0LvRgdGPINGDINCx0L7RgtC1INGC0LXQu9C10LPRgNCw0LzQvNCwIEBCbG9ja2NoYWluVGZhQm90JyxcbiAgICAgICAgZXJyb3JfZGVjb2RlX3VzZXJfYmM6ICfQntGI0LjQsdC60LAg0L/RgNC4INC/0L7Qu9GD0YfQtdC90LjQuCDQv9C+0LvRjNC30L7QstCw0YLQtdC70Y8g0LjQtyDQsdC70L7QutGH0LXQudC90LAnLFxuICAgICAgICB1bmtub3duX2Vycm9yOiAn0J3QtdC40LfQstC10YHRgtC90LDRjyDQvtGI0LjQsdC60LAnXG4gICAgfSxcbiAgICBlbjoge1xuICAgICAgICBub3RfdmVyaWZpZWQ6ICdVc2VyIGlzIG5vdCB2ZXJpZmllZCcsXG4gICAgICAgIHRlbGVncmFtX2JvdF91bnJlZ2lzdGVyZWQ6ICdVc2VyIHNlbGVjdCB0ZWxlZ3JhbSwgYnV0IG5vdCByZWdpc3RlcmVkIGluIGl0IHlldCcsXG4gICAgICAgIGVycm9yX2RlY29kZV91c2VyX2JjOiAnQ2FudCBkZWNvZGUgdXNlcicsXG4gICAgICAgIHVua25vd25fZXJyb3I6ICdVc2VyIGlzIG5vdCB2ZXJpZmllZCdcbiAgICB9LFxufTtcblxuZXhwb3J0IGNsYXNzIEFwaUNvbnRyb2xsZXIge1xuICAgIHJlZGlzQ2xpZW50OiBhbnk7XG4gICAgZW5kcG9pbnQ6IHN0cmluZztcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgdGZhVEY6IFRmYVRyYW5zYWN0aW9uRmFtaWx5LFxuICAgICAgICAgICAgICAgIHB1YmxpYyBrYXp0ZWxURjogS2F6dGVsVHJhbnNhY3Rpb25GYW1pbHksXG4gICAgICAgICAgICAgICAgcHVibGljIGVnb3ZURjogRWdvdlRyYW5zYWN0aW9uRmFtaWx5LCkge1xuICAgICAgICBQcm9taXNlZnkucHJvbWlzaWZ5QWxsKHJlZGlzKTtcbiAgICAgICAgY29uc3QgcmVkaXNVUkwgPSBgcmVkaXM6Ly8ke0VudkNvbmZpZy5SRURJU19IT1NUfToke0VudkNvbmZpZy5SRURJU19QT1JUfWA7XG4gICAgICAgIHRoaXMucmVkaXNDbGllbnQgPSByZWRpcy5jcmVhdGVDbGllbnQoe3VybDogcmVkaXNVUkx9KTtcblxuICAgICAgICB0aGlzLmVuZHBvaW50ID0gYHdzOi8vJHtFbnZDb25maWcuVkFMSURBVE9SX1JFU1RfQVBJX1VTRVJ9OlxuICAgICAgICAke0VudkNvbmZpZy5WQUxJREFUT1JfUkVTVF9BUElfUEFTU31AJHtFbnZDb25maWcuVkFMSURBVE9SX1JFU1RfQVBJX1dTfS9zYXd0b290aC13cy9zdWJzY3JpcHRpb25zYDtcbiAgICB9XG5cbiAgICB0cmFuc2Zvcm1Mb2cobG9nOiBhbnksIHNlcnZpY2U6IHN0cmluZyk6IG9iamVjdCB7XG4gICAgICAgIGNvbnN0IGZpZWxkc1RvSGFuZGxlID0gT2JqZWN0LmtleXMobG9nKTtcbiAgICAgICAgbGV0IG9iaiA9IHt9O1xuICAgICAgICBmb3IgKGxldCBmIG9mIGZpZWxkc1RvSGFuZGxlKSB7XG4gICAgICAgICAgICBpZiAoZiA9PSAnU3RhdHVzJyB8fCBmID09ICdFeHBpcmVkQXQnIHx8IGYgPT0gJ01ldGhvZCcgfHwgZiA9PSAnQWN0aW9uVGltZScpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9ialtjaGFuZ2VDYXNlLnNuYWtlQ2FzZShmKV0gPSBsb2dbZl07XG4gICAgICAgIH1cbiAgICAgICAgb2JqWydzZXJ2aWNlJ10gPSBzZXJ2aWNlO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH1cblxuICAgIGdldExhdGVzdENvZGUodXNlcjogYW55KTogYW55IHtcblxuICAgICAgICBsZXQgc2VuZENvZGVBcnJheUtleXNTb3J0ZWQgPSBbXTtcbiAgICAgICAgY29uc3QgdXNlcktleXMgPSBPYmplY3Qua2V5cyh1c2VyLkxvZ3MpO1xuXG4gICAgICAgIGlmICh1c2VyS2V5cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB7c3RhdHVzOiAnbm9fc2VuZF9jb2Rlcyd9O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY3VycmVudFRpbWVzdGFtcCA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkgLyAxMDAwO1xuICAgICAgICBjb25zdCBrZXlzTGVuZ3RoID0gdXNlcktleXMubGVuZ3RoIC0gMTtcbiAgICAgICAgbGV0IHNlbmRDb2RlQXJyYXlLZXlzID0gW107XG4gICAgICAgIGxldCB2YWxpZENvZGVBcnJheUtleXMgPSBbXTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8PSB1c2VyS2V5cy5sZW5ndGg7IGkrKykge1xuXG4gICAgICAgICAgICBjb25zdCBsb2cgPSB1c2VyLkxvZ3NbdXNlcktleXNbaV1dO1xuXG4gICAgICAgICAgICBpZiAoIWxvZy5TdGF0dXMpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxvZy5TdGF0dXMgPT09IFNFTkRfQ09ERSB8fCBsb2cuU3RhdHVzID09PSBSRVNFTkRfQ09ERSkge1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50VGltZXN0YW1wIDw9IGxvZy5FeHBpcmVkQXQgJiYgbG9nLk1ldGhvZCA9PT0gJ3B1c2gnKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbmRDb2RlQXJyYXlLZXlzLnB1c2gocGFyc2VJbnQodXNlcktleXNbaV0sIDEwKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGxvZy5TdGF0dXMgPT09IFZBTElEfHxsb2cuU3RhdHVzID09PSBSRUpFQ1QpIHtcbiAgICAgICAgICAgICAgICB2YWxpZENvZGVBcnJheUtleXMucHVzaChwYXJzZUludCh1c2VyS2V5c1tpXSwgMTApKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGkgIT09IGtleXNMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHNlbmRDb2RlQXJyYXlLZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7c3RhdHVzOiAnbm9fc2VuZF9jb2Rlcyd9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzZW5kQ29kZUFycmF5S2V5c1NvcnRlZCA9IHNlbmRDb2RlQXJyYXlLZXlzLnNvcnQoc29ydE51bWJlcik7XG5cbiAgICAgICAgICAgIGNvbnN0IGxhdGVzdENvZGVJbmRleCA9IHNlbmRDb2RlQXJyYXlLZXlzU29ydGVkLmxlbmd0aCA9PT0gMVxuICAgICAgICAgICAgICAgID8gc2VuZENvZGVBcnJheUtleXNTb3J0ZWRbMF1cbiAgICAgICAgICAgICAgICA6IHNlbmRDb2RlQXJyYXlLZXlzU29ydGVkW3NlbmRDb2RlQXJyYXlLZXlzU29ydGVkLmxlbmd0aCAtIDFdO1xuXG4gICAgICAgICAgICBjb25zdCBsYXRlc3RMb2cgPSB1c2VyLkxvZ3NbbGF0ZXN0Q29kZUluZGV4XTtcblxuICAgICAgICAgICAgaWYgKCF2YWxpZENvZGVBcnJheUtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtzdGF0dXM6ICdzdWNjZXNzJywgbG9nOiBsYXRlc3RMb2d9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB2YWxpZEtleXNMZW5ndGggPSB2YWxpZENvZGVBcnJheUtleXMubGVuZ3RoIC0gMTtcblxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB2YWxpZENvZGVBcnJheUtleXMubGVuZ3RoOyBqKyspIHtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGxvZ1ZhbGlkID0gdXNlci5Mb2dzW3ZhbGlkQ29kZUFycmF5S2V5c1tqXV07XG5cbiAgICAgICAgICAgICAgICBpZiAobG9nVmFsaWQuQ29kZSA9PT0gbGF0ZXN0TG9nLkNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtzdGF0dXM6ICdub19jb2RlX3VzZWQnfTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoaiA9PT0gdmFsaWRLZXlzTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7c3RhdHVzOiAnc3VjY2VzcycsIGxvZzogbGF0ZXN0TG9nfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXRNZXNzYWdlKGxhbmc6IHN0cmluZywgbG9jYWxlID0gJ3Vua25vd25fZXJyb3InKTogc3RyaW5nIHtcbiAgICAgICAgbGV0IF9sYW5nID0gbGFuZztcbiAgICAgICAgaWYgKCFESUNUW19sYW5nXSkge1xuICAgICAgICAgICAgX2xhbmcgPSAnZW4nO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIERJQ1RbX2xhbmddW2xvY2FsZV0gfHwgRElDVFtfbGFuZ11bJ3Vua25vd25fZXJyb3InXTtcbiAgICB9XG5cbiAgICBnZXRVc2VyTm90Rm91bmRNZXNzYWdlKGxhbmc6IHN0cmluZykge1xuICAgICAgICByZXR1cm4gbGFuZyA9PT0gJ3J1JyA/ICfQn9C+0LvRjNC30L7QstCw0YLQtdC70Ywg0L3QtSDQvdCw0LnQtNC10L0nIDogJ1VzZXIgbm90IGZvdW5kJztcbiAgICB9XG5cbiAgICBvcGVuV3NDb25uZWN0aW9uKGFkZHJlc3Nlczogc3RyaW5nW10pOiBhbnkge1xuICAgICAgICBsZXQgd3MgPSBuZXcgV2ViU29ja2V0KHRoaXMuZW5kcG9pbnQpO1xuICAgICAgICB3cy5vbm9wZW4gPSAoKSA9PiB7XG4gICAgICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAnYWN0aW9uJzogJ3N1YnNjcmliZScsXG4gICAgICAgICAgICAgICAgJ2FkZHJlc3NfcHJlZml4ZXMnOiBhZGRyZXNzZXNcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfTtcbiAgICAgICAgd3Mub25jbG9zZSA9ICgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgd3Muc2VuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICdhY3Rpb24nOiAndW5zdWJzY3JpYmUnXG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZScsIGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gd3M7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHVzZXIgd2l0aCBieSB0cmFuc2FjdGlvbiBmYSxpbHkgbmFtZVxuICAgICAqICB3ZSBuZWVkIHRvIGNoZWNrIDc3MDUwMDAwMDAwXG4gICAgICogICAgICAgICBhbmQgY2hlY2sgODcwNTAwMDAwMDBcbiAgICAgKiBwaG9uZSBudW1iZXIgY2FuIHN0YXJ0IHdpdGggOCBvciA3XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGhvbmVOdW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VydmljZVxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlPFBvc3RDbGllbnRVc2VyRFRPIHwgbnVsbD59XG4gICAgICovXG4gICAgYXN5bmMgZ2V0VXNlcihwaG9uZU51bWJlcjogc3RyaW5nLCBzZXJ2aWNlOiBzdHJpbmcpOiBQcm9taXNlPFBvc3RDbGllbnRVc2VyRFRPIHwgbnVsbD4ge1xuICAgICAgICBpZiAoIXBob25lTnVtYmVyKXtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwaG9uZU51bWJlci5jaGFyQXQoMCkgPT09ICcrJykge1xuICAgICAgICAgICAgcGhvbmVOdW1iZXIgPSBwaG9uZU51bWJlci5zdWJzdHJpbmcoMSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gd2UgbmVlZCB0byBjaGVjayA3NzA1MDAwMDAwMFxuICAgICAgICAvLyAgICAgICAgYW5kIGNoZWNrIDg3MDUwMDAwMDAwXG4gICAgICAgIC8vIHBob25lIG51bWJlciBjYW4gc3RhcnQgd2l0aCA4IG9yIDdcbiAgICAgICAgcGhvbmVOdW1iZXIgPSBwaG9uZU51bWJlci5zdWJzdHIocGhvbmVOdW1iZXIubGVuZ3RoIC0gMTApO1xuXG4gICAgICAgIC8vIGZpcnN0IGNoZWNrIHdpdGggN1xuICAgICAgICBjb25zdCBwaG9uZU51bWJlclNldmVuID0gYDcke3Bob25lTnVtYmVyfWA7XG4gICAgICAgIGNvbnN0IHBob25lTnVtYmVyRWlnaHQgPSBgOCR7cGhvbmVOdW1iZXJ9YDtcbiAgICAgICAgbGV0IHVzZXIgPSBudWxsO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdXNlciA9IGF3YWl0IHRoaXMuX2dldFVzZXIocGhvbmVOdW1iZXJTZXZlbiwgc2VydmljZSk7XG4gICAgICAgICAgICByZXR1cm4gdXNlcjtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYENhbnQgZmluZCB1c2VyIHdpdGggcGhvbmUgbnVtYmVyOiAke3Bob25lTnVtYmVyU2V2ZW59LiBUcnlpbmcgdG8gZmluZCB3aXRoIG51bWJlcjogJHtwaG9uZU51bWJlckVpZ2h0fWApO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB1c2VyID0gYXdhaXQgdGhpcy5fZ2V0VXNlcihwaG9uZU51bWJlckVpZ2h0LCBzZXJ2aWNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdXNlcjtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgQ2FudCBmaW5kIHVzZXIgd2l0aCBwaG9uZSBudW1iZXI6ICR7cGhvbmVOdW1iZXJFaWdodH0uIFJldHVybiBudWxsYCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdXNlciBieSBwaG9uZSBudW1iZXIgYW5kIHRyYW5zYWN0aW9uIGZhbWlseSBuYW1lXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGhvbmVOdW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VydmljZVxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlPFBvc3RDbGllbnRVc2VyRFRPIHwgbnVsbD59XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBwcml2YXRlIGFzeW5jIF9nZXRVc2VyKHBob25lTnVtYmVyOiBzdHJpbmcsIHNlcnZpY2U6IHN0cmluZyk6IFByb21pc2U8UG9zdENsaWVudFVzZXJEVE8gfCBudWxsPiB7XG4gICAgICAgIGxldCB1c2VyO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc3dpdGNoIChzZXJ2aWNlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAna2F6dGVsJzpcbiAgICAgICAgICAgICAgICAgICAgdXNlciA9IGF3YWl0IHRoaXMua2F6dGVsVEYuZ2V0VXNlcihwaG9uZU51bWJlcik7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2Vnb3YnOlxuICAgICAgICAgICAgICAgICAgICB1c2VyID0gYXdhaXQgdGhpcy5lZ292VEYuZ2V0VXNlcihwaG9uZU51bWJlcik7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHVzZXIgPSBhd2FpdCB0aGlzLnRmYVRGLmdldFN0YXRlQnlQaG9uZU51bWJlcihwaG9uZU51bWJlcik7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHVzZXIuUGhvbmVOdW1iZXIgPT0gJycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdXNlcjtcbiAgICB9XG59Il19