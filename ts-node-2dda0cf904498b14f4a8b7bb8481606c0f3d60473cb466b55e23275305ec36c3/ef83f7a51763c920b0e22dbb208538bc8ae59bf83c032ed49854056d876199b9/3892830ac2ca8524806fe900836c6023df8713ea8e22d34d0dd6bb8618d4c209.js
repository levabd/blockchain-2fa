"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const { createHash } = require('crypto');
const { protobuf } = require('sawtooth-sdk');
const { createContext, CryptoFactory } = require('sawtooth-sdk/signing');
const request = require("request-promise-native");
const env_1 = require("../../config/env");
const helpers_1 = require("../helpers/helpers");
const fs = require("fs");
const protobufMe = require('protocol-buffers');
const messagesClientService = protobufMe(fs.readFileSync('src/proto/service_client.proto'));
const AVAILABLE_TFS = {
    kaztel: {
        name: env_1.EnvConfig.KAZTEL_FAMILY_NAME,
        version: env_1.EnvConfig.KAZTEL_FAMILY_VERSION,
    },
    egov: {
        name: env_1.EnvConfig.EGOV_FAMILY_NAME,
        version: env_1.EnvConfig.EGOV_FAMILY_VERSION,
    },
    tfa: {
        name: env_1.EnvConfig.TFA_FAMILY_NAME,
        version: env_1.EnvConfig.TFA_FAMILY_VERSION,
    },
};
exports.CODE_CREATE = 0;
exports.CODE_UPDATE = 1;
exports.CODE_GENERATE = 2;
exports.CODE_VERIFY = 3;
let ChainService = class ChainService {
    constructor() {
        this.context = createContext('secp256k1');
        const privateKey = this.context.newRandomPrivateKey();
        this.signer = new CryptoFactory(this.context).newSigner(privateKey);
    }
    initTF(name) {
        this.tf = AVAILABLE_TFS[name]['name'];
        this.tfVersion = AVAILABLE_TFS[name]['version'];
        this.prefix = helpers_1._hash(name).substring(0, 6);
    }
    setPrefix(name) {
        this.prefix = helpers_1._hash(name).substring(0, 6);
    }
    getAddress(phoneNumber, prefix) {
        if (prefix) {
            this.setPrefix(prefix);
        }
        return this.prefix + helpers_1._hash(phoneNumber.toString()).slice(-64);
    }
    updateUser(phoneNumber, user, service = 'tfa') {
        this.initTF(service || 'tfa');
        return this.addTransaction({
            Action: exports.CODE_UPDATE,
            PhoneNumber: phoneNumber,
            PayloadUser: user,
        }, this.getAddress(phoneNumber)).then(response => {
            return JSON.parse(response).data;
        }).catch(error => {
            console.log('invalid response', error);
            throw new Error(error);
        });
    }
    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    generateCode(phoneNumber, log, tf) {
        this.initTF(tf || 'kaztel');
        const address = this.getAddress(phoneNumber);
        const payloadData = messagesClientService.SCPayload.encode({
            Action: exports.CODE_GENERATE,
            PhoneNumber: phoneNumber,
            PayloadLog: log,
        });
        return this.addTransaction(payloadData, address).then(response => {
            console.log('generateCode@response', response);
            return JSON.parse(response);
        }).catch(error => {
            console.log('invalid response', error);
            throw new Error(error);
        });
    }
    verify(phoneNumber, log, tf) {
        this.initTF(tf || 'kaztel');
        const address = this.getAddress(phoneNumber);
        const payloadData = messagesClientService.SCPayload.encode({
            Action: exports.CODE_VERIFY,
            PhoneNumber: phoneNumber,
            PayloadLog: log,
        });
        return this.addTransaction(payloadData, address).then(response => {
            return JSON.parse(response);
        }).catch(error => {
            console.log('statusCode ', error.pesponse.statusCode);
            console.log('error ', error);
            throw new Error(error);
        });
    }
    getSignedBatch(transactionList) {
        const batchHeaderBytes = protobuf.BatchHeader.encode({
            signerPublicKey: this.signer.getPublicKey().asHex(),
            transactionIds: transactionList.map((txn) => txn.headerSignature),
        }).finish();
        const signature = this.signer.sign(batchHeaderBytes);
        const batch = protobuf.Batch.create({
            header: batchHeaderBytes,
            headerSignature: signature,
            transactions: transactionList
        });
        return protobuf.BatchList.encode({
            batches: [batch]
        }).finish();
    }
    addTransaction(payloadBytes, address, dependOn = '') {
        return __awaiter(this, void 0, void 0, function* () {
            const transactionHeaderBytes = protobuf.TransactionHeader.encode({
                familyName: this.tf,
                familyVersion: this.tfVersion,
                inputs: [address],
                outputs: [address],
                signerPublicKey: this.signer.getPublicKey().asHex(),
                batcherPublicKey: this.signer.getPublicKey().asHex(),
                dependencies: [],
                payloadSha512: createHash('sha512').update(payloadBytes).digest('hex')
            }).finish();
            const signature = this.signer.sign(transactionHeaderBytes);
            const transaction = protobuf.Transaction.create({
                header: transactionHeaderBytes,
                headerSignature: signature,
                payload: payloadBytes
            });
            const bodyAsBytes = yield this.getSignedBatch([transaction]);
            console.log('`${EnvConfig.VALIDATOR_REST_API}/batches`', `${env_1.EnvConfig.VALIDATOR_REST_API}/batches`, {
                user: env_1.EnvConfig.VALIDATOR_REST_API_USER,
                pass: env_1.EnvConfig.VALIDATOR_REST_API_PASS
            }, bodyAsBytes);
            return request.post({
                family: 4,
                port: 80,
                auth: {
                    user: env_1.EnvConfig.VALIDATOR_REST_API_USER,
                    pass: env_1.EnvConfig.VALIDATOR_REST_API_PASS
                },
                url: `${env_1.EnvConfig.VALIDATOR_REST_API}/batches`,
                body: bodyAsBytes,
                headers: { 'Content-Type': 'application/octet-stream' }
            });
        });
    }
};
ChainService = __decorate([
    common_1.Component(),
    __metadata("design:paramtypes", [])
], ChainService);
exports.ChainService = ChainService;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiL2hvbWUvcGVzaGtvdi9kZXYvcHJvamVjdHMvYmxvY2tjaGFpbi0yZmEtYmFja2VuZC9zcmMvc2VydmljZXMvc2F3dG9vdGgvY2hhaW4uc2VydmljZS50cyIsInNvdXJjZXMiOlsiL2hvbWUvcGVzaGtvdi9kZXYvcHJvamVjdHMvYmxvY2tjaGFpbi0yZmEtYmFja2VuZC9zcmMvc2VydmljZXMvc2F3dG9vdGgvY2hhaW4uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQXlDO0FBRXpDLE1BQU0sRUFBQyxVQUFVLEVBQUMsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDdkMsTUFBTSxFQUFDLFFBQVEsRUFBQyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUMzQyxNQUFNLEVBQUMsYUFBYSxFQUFFLGFBQWEsRUFBQyxHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBQ3ZFLGtEQUFrRDtBQUNsRCwwQ0FBMkM7QUFDM0MsZ0RBQXlDO0FBRXpDLHlCQUF5QjtBQUd6QixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMvQyxNQUFNLHFCQUFxQixHQUFHLFVBQVUsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQztBQUM1RixNQUFNLGFBQWEsR0FBRztJQUNsQixNQUFNLEVBQUU7UUFDSixJQUFJLEVBQUUsZUFBUyxDQUFDLGtCQUFrQjtRQUNsQyxPQUFPLEVBQUUsZUFBUyxDQUFDLHFCQUFxQjtLQUMzQztJQUNELElBQUksRUFBRTtRQUNGLElBQUksRUFBRSxlQUFTLENBQUMsZ0JBQWdCO1FBQ2hDLE9BQU8sRUFBRSxlQUFTLENBQUMsbUJBQW1CO0tBQ3pDO0lBQ0QsR0FBRyxFQUFFO1FBQ0QsSUFBSSxFQUFFLGVBQVMsQ0FBQyxlQUFlO1FBQy9CLE9BQU8sRUFBRSxlQUFTLENBQUMsa0JBQWtCO0tBQ3hD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Q1QsSUFBSSxFQUFFLEVBQUU7Z0JBQ1IsSUFBSSxFQUFFO29CQUNGLElBQUksRUFBRSxlQUFTLENBQUMsdUJBQXVCO29CQUN2QyxJQUFJLEVBQUUsZUFBUyxDQUFDLHVCQUF1QjtpQkFDMUM7Z0JBQ0QsR0FBRyxFQUFFLEdBQUcsZUFBUyxDQUFDLGtCQUFrQixVQUFVO2dCQUM5QyxJQUFJLEVBQUUsV0FBVztnQkFDakIsT0FBTyxFQUFFLEVBQUMsY0FBYyxFQUFFLDBCQUEwQixFQUFDO2FBQ3hELENBQUMsQ0FBQztRQUNQLENBQUM7S0FBQTtDQUNKLENBQUE7QUFoSnFCLFlBQVk7SUFEakMsa0JBQVMsRUFBRTs7R0FDVSxZQUFZLENBZ0pqQztBQWhKcUIsb0NBQVkiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0NvbXBvbmVudH0gZnJvbSAnQG5lc3Rqcy9jb21tb24nO1xuXG5jb25zdCB7Y3JlYXRlSGFzaH0gPSByZXF1aXJlKCdjcnlwdG8nKTtcbmNvbnN0IHtwcm90b2J1Zn0gPSByZXF1aXJlKCdzYXd0b290aC1zZGsnKTtcbmNvbnN0IHtjcmVhdGVDb250ZXh0LCBDcnlwdG9GYWN0b3J5fSA9IHJlcXVpcmUoJ3Nhd3Rvb3RoLXNkay9zaWduaW5nJyk7XG5pbXBvcnQgKiBhcyByZXF1ZXN0IGZyb20gJ3JlcXVlc3QtcHJvbWlzZS1uYXRpdmUnO1xuaW1wb3J0IHtFbnZDb25maWd9IGZyb20gJy4uLy4uL2NvbmZpZy9lbnYnO1xuaW1wb3J0IHtfaGFzaH0gZnJvbSAnLi4vaGVscGVycy9oZWxwZXJzJztcbmltcG9ydCB7VXNlckxvZ30gZnJvbSAnLi4vLi4vbW9kdWxlcy9zaGFyZWQvbW9kZWxzL3VzZXIubG9nJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7QmF0Y2h9IGZyb20gJy4uLy4uL21vZHVsZXMvc2hhcmVkL21vZGVscy9iYXRjaCc7XG5cbmNvbnN0IHByb3RvYnVmTWUgPSByZXF1aXJlKCdwcm90b2NvbC1idWZmZXJzJyk7XG5jb25zdCBtZXNzYWdlc0NsaWVudFNlcnZpY2UgPSBwcm90b2J1Zk1lKGZzLnJlYWRGaWxlU3luYygnc3JjL3Byb3RvL3NlcnZpY2VfY2xpZW50LnByb3RvJykpO1xuY29uc3QgQVZBSUxBQkxFX1RGUyA9IHtcbiAgICBrYXp0ZWw6IHtcbiAgICAgICAgbmFtZTogRW52Q29uZmlnLktBWlRFTF9GQU1JTFlfTkFNRSxcbiAgICAgICAgdmVyc2lvbjogRW52Q29uZmlnLktBWlRFTF9GQU1JTFlfVkVSU0lPTixcbiAgICB9LFxuICAgIGVnb3Y6IHtcbiAgICAgICAgbmFtZTogRW52Q29uZmlnLkVHT1ZfRkFNSUxZX05BTUUsXG4gICAgICAgIHZlcnNpb246IEVudkNvbmZpZy5FR09WX0ZBTUlMWV9WRVJTSU9OLFxuICAgIH0sXG4gICAgdGZhOiB7XG4gICAgICAgIG5hbWU6IEVudkNvbmZpZy5URkFfRkFNSUxZX05BTUUsXG4gICAgICAgIHZlcnNpb246IEVudkNvbmZpZy5URkFfRkFNSUxZX1ZFUlNJT04sXG4gICAgfSxcbn07XG5cbmV4cG9ydCBjb25zdCBDT0RFX0NSRUFURSA9IDA7XG5leHBvcnQgY29uc3QgQ09ERV9VUERBVEUgPSAxO1xuZXhwb3J0IGNvbnN0IENPREVfR0VORVJBVEUgPSAyO1xuZXhwb3J0IGNvbnN0IENPREVfVkVSSUZZID0gMztcblxuQENvbXBvbmVudCgpXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ2hhaW5TZXJ2aWNlIHtcblxuICAgIC8vIFRPRE86IHJlZmFjdG9yXG4gICAgcHJvdGVjdGVkIHNpZ25lcjogYW55O1xuICAgIHByb3RlY3RlZCBjb250ZXh0OiBhbnk7XG4gICAgcHVibGljIGFic3RyYWN0IHRmOiBzdHJpbmc7XG4gICAgcHVibGljIGFic3RyYWN0IHRmVmVyc2lvbjogc3RyaW5nO1xuICAgIHByb3RlY3RlZCBhYnN0cmFjdCBwcmVmaXg6IHN0cmluZztcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLmNvbnRleHQgPSBjcmVhdGVDb250ZXh0KCdzZWNwMjU2azEnKTtcbiAgICAgICAgY29uc3QgcHJpdmF0ZUtleSA9IHRoaXMuY29udGV4dC5uZXdSYW5kb21Qcml2YXRlS2V5KCk7XG4gICAgICAgIHRoaXMuc2lnbmVyID0gbmV3IENyeXB0b0ZhY3RvcnkodGhpcy5jb250ZXh0KS5uZXdTaWduZXIocHJpdmF0ZUtleSk7XG4gICAgfVxuXG4gICAgaW5pdFRGKG5hbWU6IHN0cmluZykge1xuICAgICAgICB0aGlzLnRmID0gQVZBSUxBQkxFX1RGU1tuYW1lXVsnbmFtZSddO1xuICAgICAgICB0aGlzLnRmVmVyc2lvbiA9IEFWQUlMQUJMRV9URlNbbmFtZV1bJ3ZlcnNpb24nXTtcbiAgICAgICAgdGhpcy5wcmVmaXggPSBfaGFzaChuYW1lKS5zdWJzdHJpbmcoMCwgNik7XG4gICAgfVxuXG4gICAgc2V0UHJlZml4KG5hbWU6IHN0cmluZykge1xuICAgICAgICB0aGlzLnByZWZpeCA9IF9oYXNoKG5hbWUpLnN1YnN0cmluZygwLCA2KTtcbiAgICB9XG5cbiAgICBnZXRBZGRyZXNzKHBob25lTnVtYmVyOiBzdHJpbmcsIHByZWZpeD86IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGlmIChwcmVmaXgpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0UHJlZml4KHByZWZpeCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMucHJlZml4ICsgX2hhc2gocGhvbmVOdW1iZXIudG9TdHJpbmcoKSkuc2xpY2UoLTY0KTtcbiAgICB9XG5cbiAgICB1cGRhdGVVc2VyKHBob25lTnVtYmVyOiBzdHJpbmcsIHVzZXI6IG9iamVjdCwgc2VydmljZSA9ICd0ZmEnKTogUHJvbWlzZTxCYXRjaD4ge1xuICAgICAgICB0aGlzLmluaXRURihzZXJ2aWNlIHx8ICd0ZmEnKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkVHJhbnNhY3Rpb24oe1xuICAgICAgICAgICAgQWN0aW9uOiBDT0RFX1VQREFURSxcbiAgICAgICAgICAgIFBob25lTnVtYmVyOiBwaG9uZU51bWJlcixcbiAgICAgICAgICAgIFBheWxvYWRVc2VyOiB1c2VyLFxuICAgICAgICB9LCB0aGlzLmdldEFkZHJlc3MocGhvbmVOdW1iZXIpKS50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgIHJldHVybiA8QmF0Y2g+SlNPTi5wYXJzZShyZXNwb25zZSkuZGF0YTtcbiAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2ludmFsaWQgcmVzcG9uc2UnLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBnZXRSYW5kb21JbnQobWluLCBtYXgpIHtcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSkgKyBtaW47XG4gICAgfVxuXG4gICAgZ2VuZXJhdGVDb2RlKHBob25lTnVtYmVyOiBzdHJpbmcsIGxvZzogVXNlckxvZywgdGY6IHN0cmluZyk6IGFueSB7XG4gICAgICAgIHRoaXMuaW5pdFRGKHRmIHx8ICdrYXp0ZWwnKTtcbiAgICAgICAgY29uc3QgYWRkcmVzcyA9IHRoaXMuZ2V0QWRkcmVzcyhwaG9uZU51bWJlcik7XG4gICAgICAgIGNvbnN0IHBheWxvYWREYXRhID0gbWVzc2FnZXNDbGllbnRTZXJ2aWNlLlNDUGF5bG9hZC5lbmNvZGUoe1xuICAgICAgICAgICAgQWN0aW9uOiBDT0RFX0dFTkVSQVRFLFxuICAgICAgICAgICAgUGhvbmVOdW1iZXI6IHBob25lTnVtYmVyLFxuICAgICAgICAgICAgUGF5bG9hZExvZzogbG9nLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkVHJhbnNhY3Rpb24ocGF5bG9hZERhdGEsIGFkZHJlc3MpLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2dlbmVyYXRlQ29kZUByZXNwb25zZScsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKHJlc3BvbnNlKTtcbiAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2ludmFsaWQgcmVzcG9uc2UnLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB2ZXJpZnkocGhvbmVOdW1iZXI6IHN0cmluZywgbG9nOiBVc2VyTG9nLCB0Zjogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMuaW5pdFRGKHRmIHx8ICdrYXp0ZWwnKTtcbiAgICAgICAgY29uc3QgYWRkcmVzcyA9IHRoaXMuZ2V0QWRkcmVzcyhwaG9uZU51bWJlcik7XG4gICAgICAgIGNvbnN0IHBheWxvYWREYXRhID0gbWVzc2FnZXNDbGllbnRTZXJ2aWNlLlNDUGF5bG9hZC5lbmNvZGUoe1xuICAgICAgICAgICAgQWN0aW9uOiBDT0RFX1ZFUklGWSxcbiAgICAgICAgICAgIFBob25lTnVtYmVyOiBwaG9uZU51bWJlcixcbiAgICAgICAgICAgIFBheWxvYWRMb2c6IGxvZyxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZFRyYW5zYWN0aW9uKHBheWxvYWREYXRhLCBhZGRyZXNzKS50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKHJlc3BvbnNlKTtcbiAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3N0YXR1c0NvZGUgJywgZXJyb3IucGVzcG9uc2Uuc3RhdHVzQ29kZSApO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Vycm9yICcsIGVycm9yICk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAgZ2V0U2lnbmVkQmF0Y2godHJhbnNhY3Rpb25MaXN0OiBhbnkpOiBhbnkge1xuICAgICAgICBjb25zdCBiYXRjaEhlYWRlckJ5dGVzID0gcHJvdG9idWYuQmF0Y2hIZWFkZXIuZW5jb2RlKHtcbiAgICAgICAgICAgIHNpZ25lclB1YmxpY0tleTogdGhpcy5zaWduZXIuZ2V0UHVibGljS2V5KCkuYXNIZXgoKSxcbiAgICAgICAgICAgIHRyYW5zYWN0aW9uSWRzOiB0cmFuc2FjdGlvbkxpc3QubWFwKCh0eG4pID0+IHR4bi5oZWFkZXJTaWduYXR1cmUpLFxuICAgICAgICB9KS5maW5pc2goKTtcblxuICAgICAgICBjb25zdCBzaWduYXR1cmUgPSB0aGlzLnNpZ25lci5zaWduKGJhdGNoSGVhZGVyQnl0ZXMpO1xuICAgICAgICBjb25zdCBiYXRjaCA9IHByb3RvYnVmLkJhdGNoLmNyZWF0ZSh7XG4gICAgICAgICAgICBoZWFkZXI6IGJhdGNoSGVhZGVyQnl0ZXMsXG4gICAgICAgICAgICBoZWFkZXJTaWduYXR1cmU6IHNpZ25hdHVyZSxcbiAgICAgICAgICAgIHRyYW5zYWN0aW9uczogdHJhbnNhY3Rpb25MaXN0XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBwcm90b2J1Zi5CYXRjaExpc3QuZW5jb2RlKHtcbiAgICAgICAgICAgIGJhdGNoZXM6IFtiYXRjaF1cbiAgICAgICAgfSkuZmluaXNoKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgYWRkVHJhbnNhY3Rpb24ocGF5bG9hZEJ5dGVzOiBvYmplY3QsIGFkZHJlc3M6IHN0cmluZywgZGVwZW5kT24gPSAnJyk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uSGVhZGVyQnl0ZXMgPSBwcm90b2J1Zi5UcmFuc2FjdGlvbkhlYWRlci5lbmNvZGUoe1xuICAgICAgICAgICAgZmFtaWx5TmFtZTogdGhpcy50ZixcbiAgICAgICAgICAgIGZhbWlseVZlcnNpb246IHRoaXMudGZWZXJzaW9uLFxuICAgICAgICAgICAgaW5wdXRzOiBbYWRkcmVzc10sXG4gICAgICAgICAgICBvdXRwdXRzOiBbYWRkcmVzc10sXG4gICAgICAgICAgICBzaWduZXJQdWJsaWNLZXk6IHRoaXMuc2lnbmVyLmdldFB1YmxpY0tleSgpLmFzSGV4KCksXG4gICAgICAgICAgICAvLyBJbiB0aGlzIGV4YW1wbGUsIHdlJ3JlIHNpZ25pbmcgdGhlIGJhdGNoIHdpdGggdGhlIHNhbWUgcHJpdmF0ZSBrZXksXG4gICAgICAgICAgICAvLyBidXQgdGhlIGJhdGNoIGNhbiBiZSBzaWduZWQgYnkgYW5vdGhlciBwYXJ0eSwgaW4gd2hpY2ggY2FzZSwgdGhlXG4gICAgICAgICAgICAvLyBwdWJsaWMga2V5IHdpbGwgbmVlZCB0byBiZSBhc3NvY2lhdGVkIHdpdGggdGhhdCBrZXkuXG4gICAgICAgICAgICBiYXRjaGVyUHVibGljS2V5OiB0aGlzLnNpZ25lci5nZXRQdWJsaWNLZXkoKS5hc0hleCgpLFxuICAgICAgICAgICAgLy8gSW4gdGhpcyBleGFtcGxlLCB0aGVyZSBhcmUgbm8gZGVwZW5kZW5jaWVzLiAgVGhpcyBsaXN0IHNob3VsZCBpbmNsdWRlXG4gICAgICAgICAgICAvLyBhbiBwcmV2aW91cyB0cmFuc2FjdGlvbiBoZWFkZXIgc2lnbmF0dXJlcyB0aGF0IG11c3QgYmUgYXBwbGllZCBmb3JcbiAgICAgICAgICAgIC8vIHRoaXMgdHJhbnNhY3Rpb24gdG8gc3VjY2Vzc2Z1bGx5IGNvbW1pdC5cbiAgICAgICAgICAgIC8vIEZvciBleGFtcGxlLFxuICAgICAgICAgICAgZGVwZW5kZW5jaWVzOiBbXSxcbiAgICAgICAgICAgIHBheWxvYWRTaGE1MTI6IGNyZWF0ZUhhc2goJ3NoYTUxMicpLnVwZGF0ZShwYXlsb2FkQnl0ZXMpLmRpZ2VzdCgnaGV4JylcbiAgICAgICAgfSkuZmluaXNoKCk7XG4gICAgICAgIGNvbnN0IHNpZ25hdHVyZSA9IHRoaXMuc2lnbmVyLnNpZ24odHJhbnNhY3Rpb25IZWFkZXJCeXRlcyk7XG5cbiAgICAgICAgY29uc3QgdHJhbnNhY3Rpb24gPSBwcm90b2J1Zi5UcmFuc2FjdGlvbi5jcmVhdGUoe1xuICAgICAgICAgICAgaGVhZGVyOiB0cmFuc2FjdGlvbkhlYWRlckJ5dGVzLFxuICAgICAgICAgICAgaGVhZGVyU2lnbmF0dXJlOiBzaWduYXR1cmUsXG4gICAgICAgICAgICBwYXlsb2FkOiBwYXlsb2FkQnl0ZXNcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IGJvZHlBc0J5dGVzID0gYXdhaXQgdGhpcy5nZXRTaWduZWRCYXRjaChbdHJhbnNhY3Rpb25dKTtcbiAgICAgICAgY29uc29sZS5sb2coJ2Ake0VudkNvbmZpZy5WQUxJREFUT1JfUkVTVF9BUEl9L2JhdGNoZXNgJywgYCR7RW52Q29uZmlnLlZBTElEQVRPUl9SRVNUX0FQSX0vYmF0Y2hlc2AsIHtcbiAgICAgICAgICAgIHVzZXI6IEVudkNvbmZpZy5WQUxJREFUT1JfUkVTVF9BUElfVVNFUixcbiAgICAgICAgICAgIHBhc3M6IEVudkNvbmZpZy5WQUxJREFUT1JfUkVTVF9BUElfUEFTU1xuICAgICAgICB9LCBib2R5QXNCeXRlcyk7XG4gICAgICAgIHJldHVybiByZXF1ZXN0LnBvc3Qoe1xuICAgICAgICAgICAgZmFtaWx5OiA0LFxuICAgICAgICAgICAgcG9ydDogODAsXG4gICAgICAgICAgICBhdXRoOiB7XG4gICAgICAgICAgICAgICAgdXNlcjogRW52Q29uZmlnLlZBTElEQVRPUl9SRVNUX0FQSV9VU0VSLFxuICAgICAgICAgICAgICAgIHBhc3M6IEVudkNvbmZpZy5WQUxJREFUT1JfUkVTVF9BUElfUEFTU1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVybDogYCR7RW52Q29uZmlnLlZBTElEQVRPUl9SRVNUX0FQSX0vYmF0Y2hlc2AsXG4gICAgICAgICAgICBib2R5OiBib2R5QXNCeXRlcyxcbiAgICAgICAgICAgIGhlYWRlcnM6IHsnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSd9XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbiJdfQ==