import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import config from './config';
import { PrismaService } from './prisma.service';
import { TelegramAuthGuard } from './telegram-auth.guard';
import {
