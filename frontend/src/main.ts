import { registerLocaleData } from '@angular/common';
import localeEsSV from '@angular/common/locales/es-SV';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

registerLocaleData(localeEsSV);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
