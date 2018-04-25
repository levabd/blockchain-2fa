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
        console.log('equest.post');
        return request.post({
            auth: {
                user: env_1.EnvConfig.VALIDATOR_REST_API_USER,
                pass: env_1.EnvConfig.VALIDATOR_REST_API_PASS,
                sendImmediately: true
            },
            url: `${env_1.EnvConfig.VALIDATOR_REST_API}/batches`,
            body: this.getSignedBatch([transaction]),
            headers: { 'Content-Type': 'application/octet-stream' }
        });
    }
};
ChainService = __decorate([
    common_1.Component(),
    __metadata("design:paramtypes", [])
], ChainService);
exports.ChainService = ChainService;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiL2hvbWUvcGVzaGtvdi9kZXYvcHJvamVjdHMvYmxvY2tjaGFpbi0yZmEtYmFja2VuZC9zcmMvc2VydmljZXMvc2F3dG9vdGgvY2hhaW4uc2VydmljZS50cyIsInNvdXJjZXMiOlsiL2hvbWUvcGVzaGtvdi9kZXYvcHJvamVjdHMvYmxvY2tjaGFpbi0yZmEtYmFja2VuZC9zcmMvc2VydmljZXMvc2F3dG9vdGgvY2hhaW4uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBLDJDQUF5QztBQUV6QyxNQUFNLEVBQUMsVUFBVSxFQUFDLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3ZDLE1BQU0sRUFBQyxRQUFRLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDM0MsTUFBTSxFQUFDLGFBQWEsRUFBRSxhQUFhLEVBQUMsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUN2RSxrREFBa0Q7QUFDbEQsMENBQTJDO0FBQzNDLGdEQUF5QztBQUV6Qyx5QkFBeUI7QUFHekIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDL0MsTUFBTSxxQkFBcUIsR0FBRyxVQUFVLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUM7QUFDNUYsTUFBTSxhQUFhLEdBQUc7SUFDbEIsTUFBTSxFQUFFO1FBQ0osSUFBSSxFQUFFLGVBQVMsQ0FBQyxrQkFBa0I7UUFDbEMsT0FBTyxFQUFFLGVBQVMsQ0FBQyxxQkFBcUI7S0FDM0M7SUFDRCxJQUFJLEVBQUU7UUFDRixJQUFJLEVBQUUsZUFBUyxDQUFDLGdCQUFnQjtRQUNoQyxPQUFPLEVBQUUsZUFBUyxDQUFDLG1CQUFtQjtLQUN6QztJQUNELEdBQUcsRUFBRTtRQUNELElBQUksRUFBRSxlQUFTLENBQUMsZUFBZTtRQUMvQixPQUFPLEVBQUUsZUFBUyxDQUFDLGtCQUFrQjtLQUN4QztDQUNKLENB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b25zdCB7Y3JlYXRlSGFzaH0gPSByZXF1aXJlKCdjcnlwdG8nKTtcbmNvbnN0IHtwcm90b2J1Zn0gPSByZXF1aXJlKCdzYXd0b290aC1zZGsnKTtcbmNvbnN0IHtjcmVhdGVDb250ZXh0LCBDcnlwdG9GYWN0b3J5fSA9IHJlcXVpcmUoJ3Nhd3Rvb3RoLXNkay9zaWduaW5nJyk7XG5pbXBvcnQgKiBhcyByZXF1ZXN0IGZyb20gJ3JlcXVlc3QtcHJvbWlzZS1uYXRpdmUnO1xuaW1wb3J0IHtFbnZDb25maWd9IGZyb20gJy4uLy4uL2NvbmZpZy9lbnYnO1xuaW1wb3J0IHtfaGFzaH0gZnJvbSAnLi4vaGVscGVycy9oZWxwZXJzJztcbmltcG9ydCB7VXNlckxvZ30gZnJvbSAnLi4vLi4vbW9kdWxlcy9zaGFyZWQvbW9kZWxzL3VzZXIubG9nJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7QmF0Y2h9IGZyb20gJy4uLy4uL21vZHVsZXMvc2hhcmVkL21vZGVscy9iYXRjaCc7XG5cbmNvbnN0IHByb3RvYnVmTWUgPSByZXF1aXJlKCdwcm90b2NvbC1idWZmZXJzJyk7XG5jb25zdCBtZXNzYWdlc0NsaWVudFNlcnZpY2UgPSBwcm90b2J1Zk1lKGZzLnJlYWRGaWxlU3luYygnc3JjL3Byb3RvL3NlcnZpY2VfY2xpZW50LnByb3RvJykpO1xuY29uc3QgQVZBSUxBQkxFX1RGUyA9IHtcbiAgICBrYXp0ZWw6IHtcbiAgICAgICAgbmFtZTogRW52Q29uZmlnLktBWlRFTF9GQU1JTFlfTkFNRSxcbiAgICAgICAgdmVyc2lvbjogRW52Q29uZmlnLktBWlRFTF9GQU1JTFlfVkVSU0lPTixcbiAgICB9LFxuICAgIGVnb3Y6IHtcbiAgICAgICAgbmFtZTogRW52Q29uZmlnLkVHT1ZfRkFNSUxZX05BTUUsXG4gICAgICAgIHZlcnNpb246IEVudkNvbmZpZy5FR09WX0ZBTUlMWV9WRVJTSU9OLFxuICAgIH0sXG4gICAgdGZhOiB7XG4gICAgICAgIG5hbWU6IEVudkNvbmZpZy5URkFfRkFNSUxZX05BTUUsXG4gICAgICAgIHZlcnNpb246IEVudkNvbmZpZy5URkFfRkFNSUxZX1ZFUlNJT04sXG4gICAgfSxcbn07XG5cbmV4cG9ydCBjb25zdCBDT0RFX0NSRUFURSA9IDA7XG5leHBvcnQgY29uc3QgQ09ERV9VUERBVEUgPSAxO1xuZXhwb3J0IGNvbnN0IENPREVfR0VORVJBVEUgPSAyO1xuZXhwb3J0IGNvbnN0IENPREVfVkVSSUZZID0gMztcblxuQENvbXBvbmVudCgpXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ2hhaW5TZXJ2aWNlIHtcblxuICAgIC8vIFRPRE86IHJlZmFjdG9yXG4gICAgcHJvdGVjdGVkIHNpZ25lcjogYW55O1xuICAgIHByb3RlY3RlZCBjb250ZXh0OiBhbnk7XG4gICAgcHVibGljIGFic3RyYWN0IHRmOiBzdHJpbmc7XG4gICAgcHVibGljIGFic3RyYWN0IHRmVmVyc2lvbjogc3RyaW5nO1xuICAgIHByb3RlY3RlZCBhYnN0cmFjdCBwcmVmaXg6IHN0cmluZztcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLmNvbnRleHQgPSBjcmVhdGVDb250ZXh0KCdzZWNwMjU2azEnKTtcbiAgICAgICAgY29uc3QgcHJpdmF0ZUtleSA9IHRoaXMuY29udGV4dC5uZXdSYW5kb21Qcml2YXRlS2V5KCk7XG4gICAgICAgIHRoaXMuc2lnbmVyID0gbmV3IENyeXB0b0ZhY3RvcnkodGhpcy5jb250ZXh0KS5uZXdTaWduZXIocHJpdmF0ZUtleSk7XG4gICAgfVxuXG4gICAgaW5pdFRGKG5hbWU6IHN0cmluZykge1xuICAgICAgICB0aGlzLnRmID0gQVZBSUxBQkxFX1RGU1tuYW1lXVsnbmFtZSddO1xuICAgICAgICB0aGlzLnRmVmVyc2lvbiA9IEFWQUlMQUJMRV9URlNbbmFtZV1bJ3ZlcnNpb24nXTtcbiAgICAgICAgdGhpcy5wcmVmaXggPSBfaGFzaChuYW1lKS5zdWJzdHJpbmcoMCwgNik7XG4gICAgfVxuXG4gICAgc2V0UHJlZml4KG5hbWU6IHN0cmluZykge1xuICAgICAgICB0aGlzLnByZWZpeCA9IF9oYXNoKG5hbWUpLnN1YnN0cmluZygwLCA2KTtcbiAgICB9XG5cbiAgICBnZXRBZGRyZXNzKHBob25lTnVtYmVyOiBzdHJpbmcsIHByZWZpeD86IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGlmIChwcmVmaXgpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0UHJlZml4KHByZWZpeCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMucHJlZml4ICsgX2hhc2gocGhvbmVOdW1iZXIudG9TdHJpbmcoKSkuc2xpY2UoLTY0KTtcbiAgICB9XG5cbiAgICB1cGRhdGVVc2VyKHBob25lTnVtYmVyOiBzdHJpbmcsIHVzZXI6IG9iamVjdCwgc2VydmljZSA9ICd0ZmEnKTogUHJvbWlzZTxCYXRjaD4ge1xuICAgICAgICB0aGlzLmluaXRURihzZXJ2aWNlIHx8ICd0ZmEnKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkVHJhbnNhY3Rpb24oe1xuICAgICAgICAgICAgQWN0aW9uOiBDT0RFX1VQREFURSxcbiAgICAgICAgICAgIFBob25lTnVtYmVyOiBwaG9uZU51bWJlcixcbiAgICAgICAgICAgIFBheWxvYWRVc2VyOiB1c2VyLFxuICAgICAgICB9LCB0aGlzLmdldEFkZHJlc3MocGhvbmVOdW1iZXIpKS50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgIHJldHVybiA8QmF0Y2g+SlNPTi5wYXJzZShyZXNwb25zZSkuZGF0YTtcbiAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2ludmFsaWQgcmVzcG9uc2UnLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBnZXRSYW5kb21JbnQobWluLCBtYXgpIHtcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSkgKyBtaW47XG4gICAgfVxuXG4gICAgZ2VuZXJhdGVDb2RlKHBob25lTnVtYmVyOiBzdHJpbmcsIGxvZzogVXNlckxvZywgdGY6IHN0cmluZyk6IGFueSB7XG4gICAgICAgIHRoaXMuaW5pdFRGKHRmIHx8ICdrYXp0ZWwnKTtcbiAgICAgICAgY29uc3QgYWRkcmVzcyA9IHRoaXMuZ2V0QWRkcmVzcyhwaG9uZU51bWJlcik7XG4gICAgICAgIGNvbnN0IHBheWxvYWREYXRhID0gbWVzc2FnZXNDbGllbnRTZXJ2aWNlLlNDUGF5bG9hZC5lbmNvZGUoe1xuICAgICAgICAgICAgQWN0aW9uOiBDT0RFX0dFTkVSQVRFLFxuICAgICAgICAgICAgUGhvbmVOdW1iZXI6IHBob25lTnVtYmVyLFxuICAgICAgICAgICAgUGF5bG9hZExvZzogbG9nLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkVHJhbnNhY3Rpb24ocGF5bG9hZERhdGEsIGFkZHJlc3MpLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UocmVzcG9uc2UpO1xuICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnaW52YWxpZCByZXNwb25zZScsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvcik7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHZlcmlmeShwaG9uZU51bWJlcjogc3RyaW5nLCBsb2c6IFVzZXJMb2csIHRmOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5pbml0VEYodGYgfHwgJ2thenRlbCcpO1xuICAgICAgICBjb25zdCBhZGRyZXNzID0gdGhpcy5nZXRBZGRyZXNzKHBob25lTnVtYmVyKTtcbiAgICAgICAgY29uc3QgcGF5bG9hZERhdGEgPSBtZXNzYWdlc0NsaWVudFNlcnZpY2UuU0NQYXlsb2FkLmVuY29kZSh7XG4gICAgICAgICAgICBBY3Rpb246IENPREVfVkVSSUZZLFxuICAgICAgICAgICAgUGhvbmVOdW1iZXI6IHBob25lTnVtYmVyLFxuICAgICAgICAgICAgUGF5bG9hZExvZzogbG9nLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkVHJhbnNhY3Rpb24ocGF5bG9hZERhdGEsIGFkZHJlc3MpLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UocmVzcG9uc2UpO1xuICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBnZXRTaWduZWRCYXRjaCh0cmFuc2FjdGlvbkxpc3Q6IGFueSk6IGFueSB7XG4gICAgICAgIGNvbnN0IGJhdGNoSGVhZGVyQnl0ZXMgPSBwcm90b2J1Zi5CYXRjaEhlYWRlci5lbmNvZGUoe1xuICAgICAgICAgICAgc2lnbmVyUHVibGljS2V5OiB0aGlzLnNpZ25lci5nZXRQdWJsaWNLZXkoKS5hc0hleCgpLFxuICAgICAgICAgICAgdHJhbnNhY3Rpb25JZHM6IHRyYW5zYWN0aW9uTGlzdC5tYXAoKHR4bikgPT4gdHhuLmhlYWRlclNpZ25hdHVyZSksXG4gICAgICAgIH0pLmZpbmlzaCgpO1xuXG4gICAgICAgIGNvbnN0IHNpZ25hdHVyZSA9IHRoaXMuc2lnbmVyLnNpZ24oYmF0Y2hIZWFkZXJCeXRlcyk7XG5cbiAgICAgICAgY29uc3QgYmF0Y2ggPSBwcm90b2J1Zi5CYXRjaC5jcmVhdGUoe1xuICAgICAgICAgICAgaGVhZGVyOiBiYXRjaEhlYWRlckJ5dGVzLFxuICAgICAgICAgICAgaGVhZGVyU2lnbmF0dXJlOiBzaWduYXR1cmUsXG4gICAgICAgICAgICB0cmFuc2FjdGlvbnM6IHRyYW5zYWN0aW9uTGlzdFxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcHJvdG9idWYuQmF0Y2hMaXN0LmVuY29kZSh7XG4gICAgICAgICAgICBiYXRjaGVzOiBbYmF0Y2hdXG4gICAgICAgIH0pLmZpbmlzaCgpO1xuICAgIH1cblxuICAgIGFkZFRyYW5zYWN0aW9uKHBheWxvYWRCeXRlczogb2JqZWN0LCBhZGRyZXNzOiBzdHJpbmcsIGRlcGVuZE9uID0gJycpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICBjb25zdCB0cmFuc2FjdGlvbkhlYWRlckJ5dGVzID0gcHJvdG9idWYuVHJhbnNhY3Rpb25IZWFkZXIuZW5jb2RlKHtcbiAgICAgICAgICAgIGZhbWlseU5hbWU6IHRoaXMudGYsXG4gICAgICAgICAgICBmYW1pbHlWZXJzaW9uOiB0aGlzLnRmVmVyc2lvbixcbiAgICAgICAgICAgIGlucHV0czogW2FkZHJlc3NdLFxuICAgICAgICAgICAgb3V0cHV0czogW2FkZHJlc3NdLFxuICAgICAgICAgICAgc2lnbmVyUHVibGljS2V5OiB0aGlzLnNpZ25lci5nZXRQdWJsaWNLZXkoKS5hc0hleCgpLFxuICAgICAgICAgICAgLy8gSW4gdGhpcyBleGFtcGxlLCB3ZSdyZSBzaWduaW5nIHRoZSBiYXRjaCB3aXRoIHRoZSBzYW1lIHByaXZhdGUga2V5LFxuICAgICAgICAgICAgLy8gYnV0IHRoZSBiYXRjaCBjYW4gYmUgc2lnbmVkIGJ5IGFub3RoZXIgcGFydHksIGluIHdoaWNoIGNhc2UsIHRoZVxuICAgICAgICAgICAgLy8gcHVibGljIGtleSB3aWxsIG5lZWQgdG8gYmUgYXNzb2NpYXRlZCB3aXRoIHRoYXQga2V5LlxuICAgICAgICAgICAgYmF0Y2hlclB1YmxpY0tleTogdGhpcy5zaWduZXIuZ2V0UHVibGljS2V5KCkuYXNIZXgoKSxcbiAgICAgICAgICAgIC8vIEluIHRoaXMgZXhhbXBsZSwgdGhlcmUgYXJlIG5vIGRlcGVuZGVuY2llcy4gIFRoaXMgbGlzdCBzaG91bGQgaW5jbHVkZVxuICAgICAgICAgICAgLy8gYW4gcHJldmlvdXMgdHJhbnNhY3Rpb24gaGVhZGVyIHNpZ25hdHVyZXMgdGhhdCBtdXN0IGJlIGFwcGxpZWQgZm9yXG4gICAgICAgICAgICAvLyB0aGlzIHRyYW5zYWN0aW9uIHRvIHN1Y2Nlc3NmdWxseSBjb21taXQuXG4gICAgICAgICAgICAvLyBGb3IgZXhhbXBsZSxcbiAgICAgICAgICAgIGRlcGVuZGVuY2llczogW10sXG4gICAgICAgICAgICBwYXlsb2FkU2hhNTEyOiBjcmVhdGVIYXNoKCdzaGE1MTInKS51cGRhdGUocGF5bG9hZEJ5dGVzKS5kaWdlc3QoJ2hleCcpXG4gICAgICAgIH0pLmZpbmlzaCgpO1xuICAgICAgICBjb25zdCBzaWduYXR1cmUgPSB0aGlzLnNpZ25lci5zaWduKHRyYW5zYWN0aW9uSGVhZGVyQnl0ZXMpO1xuXG4gICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gcHJvdG9idWYuVHJhbnNhY3Rpb24uY3JlYXRlKHtcbiAgICAgICAgICAgIGhlYWRlcjogdHJhbnNhY3Rpb25IZWFkZXJCeXRlcyxcbiAgICAgICAgICAgIGhlYWRlclNpZ25hdHVyZTogc2lnbmF0dXJlLFxuICAgICAgICAgICAgcGF5bG9hZDogcGF5bG9hZEJ5dGVzXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zb2xlLmxvZygnZXF1ZXN0LnBvc3QnKTtcbiAgICAgICAgcmV0dXJuIHJlcXVlc3QucG9zdCh7XG4gICAgICAgICAgICBhdXRoOiB7XG4gICAgICAgICAgICAgICAgdXNlcjogRW52Q29uZmlnLlZBTElEQVRPUl9SRVNUX0FQSV9VU0VSLFxuICAgICAgICAgICAgICAgIHBhc3M6IEVudkNvbmZpZy5WQUxJREFUT1JfUkVTVF9BUElfUEFTUyxcbiAgICAgICAgICAgICAgICBzZW5kSW1tZWRpYXRlbHk6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1cmw6IGAke0VudkNvbmZpZy5WQUxJREFUT1JfUkVTVF9BUEl9L2JhdGNoZXNgLFxuICAgICAgICAgICAgYm9keTogdGhpcy5nZXRTaWduZWRCYXRjaChbdHJhbnNhY3Rpb25dKSxcbiAgICAgICAgICAgIGhlYWRlcnM6IHsnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSd9XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbiJdfQ==