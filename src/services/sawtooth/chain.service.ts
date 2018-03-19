import {Component} from '@nestjs/common';
const {createHash} = require('crypto');
const {protobuf} = require('sawtooth-sdk');
const {createContext, CryptoFactory} = require('sawtooth-sdk/signing');

import * as cbor from 'cbor';
import * as request from 'request-promise-native';
import {EnvConfig} from '../../config/env';
import {Log} from 'hlf-node-utils';

@Component()
export abstract class ChainService {

    // TODO: refactor

    protected batchQueue = [];
    protected transactionList = [];
    protected signer: any;
    protected context: any;
    protected timer: any;

    constructor() {
        this.context = createContext('secp256k1');
        const privateKey = this.context.newRandomPrivateKey();
        this.signer = new CryptoFactory(this.context).newSigner(privateKey);
    }


    getSignedBatch(transactionList:any) :any{
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

    addTransaction(payload: object, address: string, dependOn = '') : Promise<any>{
        const payloadBytes = cbor.encode(payload);

        const transactionHeaderBytes = protobuf.TransactionHeader.encode({
            familyName: EnvConfig.TFA_FAMILY_NAME,
            familyVersion: EnvConfig.TFA_FAMILY_VERSION,
            inputs: [address],
            outputs: [address],
            signerPublicKey: this.signer.getPublicKey().asHex(),
            // In this example, we're signing the batch with the same private key,
            // but the batch can be signed by another party, in which case, the
            // public key will need to be associated with that key.
            batcherPublicKey: this.signer.getPublicKey().asHex(),
            // In this example, there are no dependencies.  This list should include
            // an previous transaction header signatures that must be applied for
            // this transaction to successfully commit.
            // For example,
            dependencies: [],
            payloadSha512: createHash('sha512').update(payloadBytes).digest('hex')
        }).finish();

        const signature = this.signer.sign(transactionHeaderBytes);

        const transaction = protobuf.Transaction.create({
            header: transactionHeaderBytes,
            headerSignature: signature,
            payload: payloadBytes
        });

        // this.addToBatch(transaction);
        const batchListBytes = this.getSignedBatch([transaction]);

        return request.post({
            url: `${EnvConfig.VALIDATOR_REST_API}/batches`,
            body: batchListBytes,
            headers: {'Content-Type': 'application/octet-stream'}
        });
    }
}