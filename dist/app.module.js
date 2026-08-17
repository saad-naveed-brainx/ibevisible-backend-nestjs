"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const health_module_1 = require("./health/health.module");
const organizations_module_1 = require("./organizations/organizations.module");
const users_module_1 = require("./users/users.module");
const content_module_1 = require("./content/content.module");
const ai_module_1 = require("./ai/ai.module");
const organization_entity_1 = require("./organizations/organization.entity");
const invitation_entity_1 = require("./organizations/invitation.entity");
const user_entity_1 = require("./users/user.entity");
const content_item_entity_1 = require("./content/content-item.entity");
const database_config_1 = __importDefault(require("./config/database.config"));
const auth_config_1 = __importDefault(require("./config/auth.config"));
const ai_config_1 = __importDefault(require("./config/ai.config"));
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [database_config_1.default, auth_config_1.default, ai_config_1.default],
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'postgres',
                    host: config.get('database.host'),
                    port: config.get('database.port'),
                    username: config.get('database.user'),
                    password: config.get('database.password'),
                    database: config.get('database.name'),
                    entities: [organization_entity_1.Organization, invitation_entity_1.Invitation, user_entity_1.User, content_item_entity_1.ContentItem],
                    synchronize: false,
                }),
            }),
            organizations_module_1.OrganizationsModule,
            users_module_1.UsersModule,
            content_module_1.ContentModule,
            ai_module_1.AiModule,
            auth_module_1.AuthModule,
            health_module_1.HealthModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map