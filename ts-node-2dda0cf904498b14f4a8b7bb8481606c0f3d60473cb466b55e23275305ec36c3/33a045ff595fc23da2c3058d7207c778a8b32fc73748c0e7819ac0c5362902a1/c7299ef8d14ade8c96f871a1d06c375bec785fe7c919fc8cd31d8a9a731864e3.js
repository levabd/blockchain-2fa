"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const helpers_1 = require("../services/helpers/helpers");
class EnvConfig {
}
EnvConfig.NODE_ENV = process.env['NODE_ENV'] || 'LOCAL';
EnvConfig.API_KEY = process.env['API_KEY'] || 'sgdfhdmgdkfgjk';
EnvConfig.API_KEY_FRONTEND = process.env['API_KEY_FRONTEND'] || 'sgdfhdmgdkfgjk';
EnvConfig.API_PATH = process.env['API_PATH'];
EnvConfig.PORT = process.env['PORT'] || 4001;
EnvConfig.REDIS_HOST = process.env['REDIS_HOST'];
EnvConfig.REDIS_PORT = process.env['REDIS_PORT'];
EnvConfig.SMS_USERNAME = process.env['SMS_USERNAME'];
EnvConfig.SMS_PASSWORD = process.env['SMS_PASSWORD'];
EnvConfig.SMS_CALLBACK_TOKEN = process.env['SMS_CALLBACK_TOKEN'];
EnvConfig.FIREBASE_CLOUD_KEY = process.env['FIREBASE_CLOUD_KEY'];
EnvConfig.TFA_FAMILY_NAME = process.env['TFA_FAMILY_NAME'];
EnvConfig.TFA_FAMILY_VERSION = process.env['TFA_FAMILY_VERSION'] || '0.1';
EnvConfig.TFA_FAMILY_NAMESPACE = helpers_1._hash(process.env['TFA_FAMILY_NAME']).substring(0, 6);
EnvConfig.KAZTEL_FAMILY_NAME = process.env['KAZTEL_FAMILY_NAME'];
EnvConfig.KAZTEL_FAMILY_VERSION = process.env['KAZTEL_FAMILY_VERSION'] || '0.1';
EnvConfig.EGOV_FAMILY_NAME = process.env['EGOV_FAMILY_NAME'];
EnvConfig.EGOV_FAMILY_VERSION = process.env['EGOV_FAMILY_VERSION'];
EnvConfig.VALIDATOR_REST_API = process.env['VALIDATOR_REST_API'];
EnvConfig.VALIDATOR_REST_API_PASS = process.env['VALIDATOR_REST_API_PASS'];
EnvConfig.VALIDATOR_REST_API_USER = process.env['VALIDATOR_REST_API_USER'];
EnvConfig.VALIDATOR_REST_API_WS = process.env['VALIDATOR_REST_API_WS'];
EnvConfig.FRONTEND_API = process.env['FRONTEND_API'];
EnvConfig.KAZTEL_CALLBACK_URL = process.env['KAZTEL_CALLBACK_URL'];
EnvConfig.EGOV_CALLBACK_URL = process.env['EGOV_CALLBACK_URL'];
EnvConfig.TELEGRAM_BOT_KEY = process.env['TELEGRAM_BOT_KEY'];
EnvConfig.MONGO_DB = process.env['MONGO_DB'];
exports.EnvConfig = EnvConfig;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiL2hvbWUvcGVzaGtvdi9kZXYvcHJvamVjdHMvYmxvY2tjaGFpbi0yZmEtYmFja2VuZC9zcmMvY29uZmlnL2Vudi50cyIsInNvdXJjZXMiOlsiL2hvbWUvcGVzaGtvdi9kZXYvcHJvamVjdHMvYmxvY2tjaGFpbi0yZmEtYmFja2VuZC9zcmMvY29uZmlnL2Vudi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHlCQUF1QjtBQUN2Qix5REFBa0Q7QUFTbEQ7O0FBR2tCLGtCQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxPQUFPLENBQUM7QUFDOUMsaUJBQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLGdCQUFnQixDQUFDO0FBQ3JELDBCQUFnQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQztBQUN2RSxrQkFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDbkMsY0FBSSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDO0FBR25DLG9CQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUN2QyxvQkFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7QUFHdkMsc0JBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzNDLHNCQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUMzQyw0QkFBa0IsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFHdkQsNEJBQWtCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBR3ZELHlCQUFlLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQ2pELDRCQUFrQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsSUFBSSxLQUFLLENBQUM7QUFDaEUsOEJBQW9CLEdBQUcsZUFBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFN0UsNEJBQWtCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQ3ZELCtCQUFxQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsSUFBSSxLQUFLLENBQUM7QUFFdEUsMEJBQWdCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ25ELDZCQUFtQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUV6RCw0QkFBa0IsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDdkQsaUNBQXVCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBQ2pFLGlDQUF1QixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQztBQUNqRSwrQkFBcUIsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFFN0Qsc0JBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBRzNDLDZCQUFtQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUN6RCwyQkFBaUIsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFDckQsMEJBQWdCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBRW5ELGtCQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQTVDckQsOEJBNkNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICdkb3RlbnYvY29uZmlnJztcbmltcG9ydCB7X2hhc2h9IGZyb20gJy4uL3NlcnZpY2VzL2hlbHBlcnMvaGVscGVycyc7XG5cbi8qKlxuICogbm9kZSBFbnZDb25maWcgdmFyaWFibGVzLFxuICogY29weSAuZW52LmV4YW1wbGUgZmlsZSwgcmVuYW1lIHRvIC5lbnZcbiAqXG4gKiBAZXhwb3J0XG4gKiBAY2xhc3MgRW52Q29uZmlnXG4gKi9cbmV4cG9ydCBjbGFzcyBFbnZDb25maWcge1xuXG4gICAgLy8gTk9ERVxuICAgIHB1YmxpYyBzdGF0aWMgTk9ERV9FTlYgPSBwcm9jZXNzLmVudlsnTk9ERV9FTlYnXSB8fCAnTE9DQUwnO1xuICAgIHB1YmxpYyBzdGF0aWMgQVBJX0tFWSA9IHByb2Nlc3MuZW52WydBUElfS0VZJ10gfHwgJ3NnZGZoZG1nZGtmZ2prJztcbiAgICBwdWJsaWMgc3RhdGljIEFQSV9LRVlfRlJPTlRFTkQgPSBwcm9jZXNzLmVudlsnQVBJX0tFWV9GUk9OVEVORCddIHx8ICdzZ2RmaGRtZ2RrZmdqayc7XG4gICAgcHVibGljIHN0YXRpYyBBUElfUEFUSCA9IHByb2Nlc3MuZW52WydBUElfUEFUSCddO1xuICAgIHB1YmxpYyBzdGF0aWMgUE9SVCA9IHByb2Nlc3MuZW52WydQT1JUJ10gfHwgNDAwMTtcblxuICAgIC8vIFJlZGlzIGNvbmZpZ3VyYXRpb25cbiAgICBwdWJsaWMgc3RhdGljIFJFRElTX0hPU1QgPSBwcm9jZXNzLmVudlsnUkVESVNfSE9TVCddO1xuICAgIHB1YmxpYyBzdGF0aWMgUkVESVNfUE9SVCA9IHByb2Nlc3MuZW52WydSRURJU19QT1JUJ107XG5cbiAgICAvLyBSZWRpcyBjb25maWd1cmF0aW9uXG4gICAgcHVibGljIHN0YXRpYyBTTVNfVVNFUk5BTUUgPSBwcm9jZXNzLmVudlsnU01TX1VTRVJOQU1FJ107XG4gICAgcHVibGljIHN0YXRpYyBTTVNfUEFTU1dPUkQgPSBwcm9jZXNzLmVudlsnU01TX1BBU1NXT1JEJ107XG4gICAgcHVibGljIHN0YXRpYyBTTVNfQ0FMTEJBQ0tfVE9LRU4gPSBwcm9jZXNzLmVudlsnU01TX0NBTExCQUNLX1RPS0VOJ107XG5cbiAgICAvLyBDbGllbnRTZXJ2aWNlIGVudiB2YXJpYWJsZXNcbiAgICBwdWJsaWMgc3RhdGljIEZJUkVCQVNFX0NMT1VEX0tFWSA9IHByb2Nlc3MuZW52WydGSVJFQkFTRV9DTE9VRF9LRVknXTtcblxuICAgIC8vIFRyYW5zYWN0aW9uIEZhbWlsaWVzIGNvbmZpZ1xuICAgIHB1YmxpYyBzdGF0aWMgVEZBX0ZBTUlMWV9OQU1FID0gcHJvY2Vzcy5lbnZbJ1RGQV9GQU1JTFlfTkFNRSddO1xuICAgIHB1YmxpYyBzdGF0aWMgVEZBX0ZBTUlMWV9WRVJTSU9OID0gcHJvY2Vzcy5lbnZbJ1RGQV9GQU1JTFlfVkVSU0lPTiddIHx8ICcwLjEnO1xuICAgIHB1YmxpYyBzdGF0aWMgVEZBX0ZBTUlMWV9OQU1FU1BBQ0UgPSBfaGFzaChwcm9jZXNzLmVudlsnVEZBX0ZBTUlMWV9OQU1FJ10pLnN1YnN0cmluZygwLCA2KTtcblxuICAgIHB1YmxpYyBzdGF0aWMgS0FaVEVMX0ZBTUlMWV9OQU1FID0gcHJvY2Vzcy5lbnZbJ0tBWlRFTF9GQU1JTFlfTkFNRSddO1xuICAgIHB1YmxpYyBzdGF0aWMgS0FaVEVMX0ZBTUlMWV9WRVJTSU9OID0gcHJvY2Vzcy5lbnZbJ0tBWlRFTF9GQU1JTFlfVkVSU0lPTiddIHx8ICcwLjEnO1xuXG4gICAgcHVibGljIHN0YXRpYyBFR09WX0ZBTUlMWV9OQU1FID0gcHJvY2Vzcy5lbnZbJ0VHT1ZfRkFNSUxZX05BTUUnXTtcbiAgICBwdWJsaWMgc3RhdGljIEVHT1ZfRkFNSUxZX1ZFUlNJT04gPSBwcm9jZXNzLmVudlsnRUdPVl9GQU1JTFlfVkVSU0lPTiddO1xuXG4gICAgcHVibGljIHN0YXRpYyBWQUxJREFUT1JfUkVTVF9BUEkgPSBwcm9jZXNzLmVudlsnVkFMSURBVE9SX1JFU1RfQVBJJ107XG4gICAgcHVibGljIHN0YXRpYyBWQUxJREFUT1JfUkVTVF9BUElfUEFTUyA9IHByb2Nlc3MuZW52WydWQUxJREFUT1JfUkVTVF9BUElfUEFTUyddO1xuICAgIHB1YmxpYyBzdGF0aWMgVkFMSURBVE9SX1JFU1RfQVBJX1VTRVIgPSBwcm9jZXNzLmVudlsnVkFMSURBVE9SX1JFU1RfQVBJX1VTRVInXTtcbiAgICBwdWJsaWMgc3RhdGljIFZBTElEQVRPUl9SRVNUX0FQSV9XUyA9IHByb2Nlc3MuZW52WydWQUxJREFUT1JfUkVTVF9BUElfV1MnXTtcblxuICAgIHB1YmxpYyBzdGF0aWMgRlJPTlRFTkRfQVBJID0gcHJvY2Vzcy5lbnZbJ0ZST05URU5EX0FQSSddO1xuXG4gICAgLy8gQ2xpZW50cyBjYWxsYmFjayB1cmxzXG4gICAgcHVibGljIHN0YXRpYyBLQVpURUxfQ0FMTEJBQ0tfVVJMID0gcHJvY2Vzcy5lbnZbJ0tBWlRFTF9DQUxMQkFDS19VUkwnXTtcbiAgICBwdWJsaWMgc3RhdGljIEVHT1ZfQ0FMTEJBQ0tfVVJMID0gcHJvY2Vzcy5lbnZbJ0VHT1ZfQ0FMTEJBQ0tfVVJMJ107XG4gICAgcHVibGljIHN0YXRpYyBURUxFR1JBTV9CT1RfS0VZID0gcHJvY2Vzcy5lbnZbJ1RFTEVHUkFNX0JPVF9LRVknXTtcblxuICAgIHB1YmxpYyBzdGF0aWMgTU9OR09fREIgPSBwcm9jZXNzLmVudlsnTU9OR09fREInXTtcbn0iXX0=