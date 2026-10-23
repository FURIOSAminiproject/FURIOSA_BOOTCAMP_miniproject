import { Test, type TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { TourBatchController } from './tour-batch.controller';
import { TourBatchRunner, type TourBatchResult } from './tour-batch.runner';

describe('TourBatchController', () => {
  let controller: TourBatchController;
  const mockRunner = {
    run: jest.fn<() => Promise<TourBatchResult>>(),
  };

  beforeEach(async () => {
    mockRunner.run.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TourBatchController],
      providers: [
        {
          provide: TourBatchRunner,
          useValue: mockRunner,
        },
      ],
    }).compile();

    controller = module.get<TourBatchController>(TourBatchController);
  });

  it('triggers batch run on POST /places/batch/run', async () => {
    mockRunner.run.mockResolvedValue({ status: 'completed' });
    const result = await controller.runBatch();
    expect(mockRunner.run).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 'completed' });
  });
});
