import { Test, type TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { TourBatchController } from './tour-batch.controller';
import { TourBatchRunner, type TourBatchResult } from './tour-batch.runner';

describe('TourBatchController', () => {
  let controller: TourBatchController;
  const mockRunner = {
    run: jest.fn<() => Promise<TourBatchResult>>(),
    runManual: jest.fn<(options?: any) => Promise<TourBatchResult>>(),
  };

  beforeEach(async () => {
    mockRunner.run.mockReset();
    mockRunner.runManual.mockReset();
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

  it('triggers batch run on POST /places/batch/run without body', async () => {
    mockRunner.run.mockResolvedValue({ status: 'completed' });
    const result = await controller.runBatch();
    expect(mockRunner.run).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 'completed' });
  });

  it('triggers manual run on POST /places/batch/initial', async () => {
    mockRunner.runManual.mockResolvedValue({ status: 'completed' });
    const result = await controller.runInitialPost({ pageSize: 50, maxPages: 5 });
    expect(mockRunner.runManual).toHaveBeenCalledWith({ mode: 'initial', pageSize: 50, maxPages: 5 });
    expect(result).toEqual({ status: 'completed' });
  });

  it('triggers manual run on GET /places/batch/initial with query', async () => {
    mockRunner.runManual.mockResolvedValue({ status: 'completed' });
    const result = await controller.runInitialGet({ region: '26' });
    expect(mockRunner.runManual).toHaveBeenCalledWith({ mode: 'initial', region: '26' });
    expect(result).toEqual({ status: 'completed' });
  });

  it('triggers manual run on POST /places/batch/run with mode initial', async () => {
    mockRunner.runManual.mockResolvedValue({ status: 'completed' });
    const result = await controller.runBatch({ mode: 'initial', maxPages: 10 });
    expect(mockRunner.runManual).toHaveBeenCalledWith({ mode: 'initial', maxPages: 10 });
    expect(result).toEqual({ status: 'completed' });
  });
});
