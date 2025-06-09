import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  ParseIntPipe,
  ValidationPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SubscriptionService } from '../services/subscription.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { Subscription, SubscriptionStatus } from '../models/subscription.entity';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @ApiOperation({ summary: 'Get all subscriptions with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-based)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: SubscriptionStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in title and description' })
  @ApiResponse({
    status: 200,
    description: 'Return paginated subscriptions',
    schema: {
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/Subscription' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('status') status?: SubscriptionStatus,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<Subscription>> {
    if (page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    return this.subscriptionService.findAll({
      page,
      limit,
      status,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'Return the subscription', type: Subscription })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionService.findOne(id);
    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }
    return subscription;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({
    status: 201,
    description: 'The subscription has been successfully created',
    type: Subscription,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or feed URL already exists',
  })
  async create(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    try {
      return await this.subscriptionService.create(createSubscriptionDto);
    } catch (error) {
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        throw new BadRequestException('Feed URL already exists');
      }
      throw error;
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update subscription by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Subscription ID' })
  @ApiResponse({
    status: 200,
    description: 'The subscription has been successfully updated',
    type: Subscription,
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  @ApiResponse({ status: 400, description: 'Invalid input or feed URL already exists' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    try {
      const subscription = await this.subscriptionService.update(
        id,
        updateSubscriptionDto,
      );
      if (!subscription) {
        throw new NotFoundException(`Subscription with ID ${id} not found`);
      }
      return subscription;
    } catch (error) {
      if (error.code === '23505') {
        throw new BadRequestException('Feed URL already exists');
      }
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete subscription by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Subscription ID' })
  @ApiResponse({ status: 204, description: 'The subscription has been successfully deleted' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    const result = await this.subscriptionService.remove(id);
    if (!result) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }
  }

  @Post(':id/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually refresh subscription feed' })
  @ApiParam({ name: 'id', type: Number, description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'The subscription feed has been refreshed' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async refresh(@Param('id', ParseIntPipe) id: number): Promise<void> {
    const subscription = await this.subscriptionService.findOne(id);
    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }
    await this.subscriptionService.refreshFeed(id);
  }
}