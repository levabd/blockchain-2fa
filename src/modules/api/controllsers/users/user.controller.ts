import {Body, Controller, Get, HttpStatus, Post, Put, Query, Req, Res} from '@nestjs/common';
import {ApiUseTags} from '@nestjs/swagger';

import {Log} from 'hlf-node-utils';
import * as redis from 'redis';
import * as Promisefy from 'bluebird';
import {PostVerifyNumberDTO} from '../../../shared/models/dto/post.verify.number.dto';
import {CodeQueueListenerService} from '../../../../services/code_sender/queue.service';
import {ClientService} from '../../../../config/services/services';
import {TimeHelper} from '../../../../services/helpers/time.helper';
import {Validator} from '../../../../services/helpers/validation.helper';
import {TwoFaUser} from '../../../shared/models/chaincode/twofa/user.model';
import {TwoFaUserService} from '../../../shared/user.service';
import {PostUserDTO} from '../../../shared/models/dto/post.user.dto';
import {PostCodeDTO} from '../../../shared/models/dto/post.code.dto';
import {PostVerifyCodeDTO} from '../../../shared/models/dto/post.verify.dto';

@ApiUseTags('v1/api/users')
@Controller('v1/api/users')
export class UserController {
    private redisClient;

    /**
     * Creates an instance of CarController.
     * @memberof CarController
     * @param timeHelper
     * @param twofaService
     * @param services
     * @param codeQueueListenerService
     */
    constructor(private timeHelper: TimeHelper,
                private twofaService: TwoFaUserService,
                private services: ClientService,
                private codeQueueListenerService: CodeQueueListenerService) {
        Promisefy.promisifyAll(redis);
        this.redisClient = redis.createClient();
    }

    @Post()
    postUser(@Res() res, @Body() userDto: PostUserDTO): void {

        let v = new Validator(userDto, {
            name: 'required|string',
            phone_number: 'required|string|regex:/^\\+?[1-9]\\d{1,14}$/',
            service: 'required|in:kazakhtelecom',
            client_timestamp: 'required|number',
            uin: 'nullable|number|maxNumber:1000000000000',
            sex: 'nullable|string|in:male,female',
            birthdate: 'nullable|date',
            method: 'required|in:sms,telegram,whatsapp',
        }, {'service.in': `No service with name: ${userDto.Service}`});

        if (v.fails()) {
            return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json(v.getErrors());
        }

        return res.status(HttpStatus.OK).json({status: `success`});
    }

    @Put()
    putUser(@Res() res, @Body() userDto: PostUserDTO): void {

        let v = new Validator(userDto, {
            name: 'required|string',
            phone_number: 'required|string|regex:/^\\+?[1-9]\\d{1,14}$/',
            service: 'required|in:kazakhtelecom',
            client_timestamp: 'required|number',
            uin: 'nullable|number|maxNumber:1000000000000',
            sex: 'nullable|string|in:male,female',
            birthdate: 'nullable|date',
            method: 'required|in:sms,telegram,whatsapp',
        }, {'service.in': `No service with name: ${userDto.Service}`});

        if (v.fails()) {
            return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json(v.getErrors());
        }

        res.render('kazahtelecom/index', {message: 'Hello world!'});
    }

    @Get('verify-number')
    async sendUserCode(@Res() res, @Query('phone_number') phoneNumber: string, @Query('service') service?: string): Promise<any[]> {

        let v = new Validator({
            phone_number: phoneNumber,
            service: service
        }, {
            phone_number: 'required|string|regex:/^\\+?[1-9]\\d{1,14}$/',
            service: 'required|string|in:kazakhtelecom',
        }, {'service.in': `No service with name: ${service}`});

        if (v.fails()) {
            return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json(v.getErrors());
        }

        // vallidate if user exists
        // '77053234005'
        let HFUser = new TwoFaUser('', '');
        try {
            HFUser = await this.twofaService.queryUser(phoneNumber);
            // const o:any = await this.twofaService.queryUser(phoneNumber);
            Log.app.error(`HFUser`, HFUser);

        } catch (e) {
            Log.app.error(`Error while getting user`, e);
            return res.status(HttpStatus.NOT_FOUND).json({error: 'User not found.'});
        }

        // send sms
        const code = this.sendSMS(phoneNumber, service);
        const unixtime = this.timeHelper.getUnixTimeAfterMinutes(7);

        if (service === '') {
            service = 'service_is_impty';
        }
        // save code to redis
        // this key will expire after 8 * 60 seconds
        this.redisClient.setAsync(`${phoneNumber}:${service}`, `${code}:${unixtime}`, 'EX', 7 * 60).then(function (_res) {
            Log.app.info(`Set Redis response status:`, _res);
        });

        this.redisClient.getAsync(`${phoneNumber}:${service}`).then(function (_res) {
            Log.app.info(`Under the key ${phoneNumber}:${service} Redis will store data:`, _res);
        });

        return res.status(HttpStatus.OK).json({status: 'success'});
    }

    @Post('verify-number')
    async verifyNumber(@Res() res, @Body() body: PostVerifyNumberDTO): Promise<any[]> {
        let v = new Validator(body, {
            phone_number: 'required|string|regex:/^\\+?[1-9]\\d{1,14}$/',
            service: 'requiredIfNot:push_token|string|in:kazakhtelecom',
            push_token: 'nullable|string',
            code: 'required|number',
        }, {
            'service.in': `No service with name: ${body.service}`,
            'service.requiredIfNot': `The service field is required when push_token is empty.`
        });

        v.addError('code', `The 'code' field is not valid.`);
        v.addError('code', `The 'code' expires.`);

        if (v.fails()) {
            return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json(v.getErrors());
        }

        // vallidate if user exists
        // '77053234005'
        let HFUser = new TwoFaUser('', '');
        try {
            HFUser = await this.twofaService.queryUser(body.phone_number);
        } catch (e) {
            Log.app.error(`Error while getting user`, e);
            return res.status(HttpStatus.NOT_FOUND).json({error: 'User not found.'});
        }

        if (body.service === '') {
            body.service = 'service_is_impty';
        }

        return res.status(HttpStatus.OK).json({status: 'success'});
    }

    @Post('code')
    postCode(@Res() res, @Body() body: PostCodeDTO) {
        let v = new Validator(body, {
            phone_number: 'required|string|regex:/^\\+?[1-9]\\d{1,14}$/',
            service: 'requiredIfNot:push_token|string|in:kazakhtelecom',
            push_token: 'nullable|string',
            event: 'required|string',
            embeded: 'required|boolean',
            client_timestamp: 'required|number',
            cert: 'nullable',
        }, {'service.in': `No service with name: ${body.service}`});

        if (v.fails()) {
            return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json(v.getErrors());
        }

        if (body.embeded) {
            return res.status(HttpStatus.OK).json({
                'name': 'Гвендолин',                    // Имя пользователя
                'phone_number': '+469983057932',        // Телефон пользователя
                'remember_cooldown': 2592000,         // Срок на который был запомнен второй фактор авторизации
                'status': 'success'
            });
        }
        return res.status(HttpStatus.OK).json({
            'resend_cooldown': 600,         // Количество секунд за которые надо ввести код и за которые нельзя отправить код повторно
            'method': 'push',               // Метод отправки (in:push,sms,telegram,whatsapp)
            'status': 'success'
        });
    }

    @Get('code')
    getCode(@Req() req, @Res() res,
            @Query('phone_number') phoneNumber: string,
            @Query('push_token') pushToken: string,
            @Query('client_timestamp') clientTimestamp: string) {

        let v = new Validator(req.query, {
            phone_number: 'required|string|regex:/^\\+?[1-9]\\d{1,14}$/',
            push_token: 'required|string',
            client_timestamp: 'required|number',
        });

        // todo add The push token is wrong. validation

        if (v.fails()) {
            return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json(v.getErrors());
        }

        return res.status(HttpStatus.OK).json({
            'service': 'kazakhtelecom',
            'embeded': 'true',
            'event': 'login',
            'cert': '3u+UR6n8AgABAAAAHxxdXKmiOmUoqKnZlf8lTOhlPYy93EAkbPfs5+49YLFd/B1+omSKbW7DoqNM40/EeVnwJ8kYoXv9zy9D5C5m5A==', // ,
            'code': '4444',
            'status': 'success'
        });
    }

    @Post('verify')
    postVerify(@Res() res, @Body() body: PostVerifyCodeDTO) {
        let v = new Validator(body, {
            phone_number: 'required|string|regex:/^\\+?[1-9]\\d{1,14}$/',
            service: 'string|in:kazakhtelecom',
            event: 'required|string',
            code: 'required|number',
            embeded: 'required|boolean',
            remember: 'required|boolean',
            client_timestamp: 'required|number',
            cert: 'nullable',
        }, {'service.in': `No service with name: ${body.service}`});

        if (v.fails()) {
            return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json(v.getErrors());
        }
        return res.status(HttpStatus.OK).json({
            'resend_cooldown': 600,         // Количество секунд за которые надо ввести код и за которые нельзя отправить код повторно
            'method': 'push',               // Метод отправки (in:push,sms,telegram,whatsapp)
            'status': 'success'
        });
    }

    private sendSMS(phoneNumber: string, service: string): number {
        const code = this.genCode();
        this.codeQueueListenerService.queueSMS.add(
            {
                phone_number: phoneNumber,
                service: service ? service : 'kazahtelecom',
                code: code,
            });

        return code;
    }

    private genCode(): number {
        // todo check code length
        const code = Math.floor(Math.random() * 999999);
        Log.app.info(`Code sent: `, code);
        return code;
    }

}