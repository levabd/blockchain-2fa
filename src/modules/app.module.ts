import {EnvConfig} from '../config/env';
import {MiddlewaresConsumer, Module} from '@nestjs/common';
import {NestModule} from '@nestjs/common/interfaces';

import {CodeQueueListenerService} from '../services/code_sender/queue.service';
import {WebModule} from './web/web.module';
import {ApiModule} from './api/api.module';
import {SharedModule} from './shared/shared.module';
import {Log} from 'hlf-node-utils';

@Module({
    modules: [
        WebModule,
        ApiModule,
        SharedModule
    ],
    exports: [
        SharedModule
    ]
})
export class ApplicationModule implements NestModule {
    /**
     * Creates an instance of ApplicationModule.
     * @param codeQueueListenerService
     * @memberof ApplicationModule
     */
    constructor(private codeQueueListenerService: CodeQueueListenerService) {
        // list env keys in cli
        for (let propName of Object.keys(EnvConfig)) {
            Log.config.debug(`${propName}:  ${EnvConfig[propName]}`);
        }

        // init queue listener
        this.codeQueueListenerService.listen();
    }
    configure(consumer: MiddlewaresConsumer): MiddlewaresConsumer | void {
        return undefined;
    }
}
