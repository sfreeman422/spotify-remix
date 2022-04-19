import { SampleService } from './sample.service';

describe('SampleService', () => {
  let sampleService: SampleService;

  beforeEach(() => {
    sampleService = new SampleService();
  });

  describe('greet()', () => {
    it('should return the text it is provided', () => {
      expect(sampleService.greet('Test')).toBe('Test');
    });

    it('should not something it is not given', () => {
      expect(sampleService.greet('Test')).not.toBe('test');
    });
  });
});
