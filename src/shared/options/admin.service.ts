import Note from '@libs/db/models/note.model'
import { Option } from '@libs/db/models/option.model'
import Post from '@libs/db/models/post.model'
import { User } from '@libs/db/models/user.model'
import {
  Injectable,
  ValidationPipe,
  UnprocessableEntityException,
} from '@nestjs/common'
import { ReturnModelType } from '@typegoose/typegoose'
import { plainToClass } from 'class-transformer'
import { validate } from 'class-validator'
import { InjectModel } from 'nestjs-typegoose'
import {
  UrlDto,
  CommentOptions,
  ImageBedDto,
  MailOptionsDto,
  SEODto,
} from '../../configs/configs.dto'
import { IConfig, ConfigsService } from '../../configs/configs.service'
import { ClassType } from 'class-transformer/ClassTransformer'

@Injectable()
export class OptionsService {
  constructor(
    @InjectModel(Option)
    private readonly optionModel: ReturnModelType<typeof Option>,
    @InjectModel(User) private readonly userModel: ReturnModelType<typeof User>,
    @InjectModel(Post) private readonly postModel: ReturnModelType<typeof Post>,
    @InjectModel(Note) private readonly nodeModel: ReturnModelType<typeof Note>,
    private readonly configs: ConfigsService,
  ) {}

  async getStat() {
    const posts = await this.postModel.countDocuments()
    const notes = await this.nodeModel.countDocuments()

    return { posts, notes }
  }
  validOptions = {
    whitelist: true,
  }
  validate = new ValidationPipe(this.validOptions)
  async patchAndValid(key: keyof IConfig, value: any) {
    switch (key) {
      case 'url': {
        await this.validWithDto(UrlDto, value)
        return this.configs.patch('url', value)
      }
      case 'commentOptions': {
        await this.validWithDto(CommentOptions, value)
        return this.configs.patch('commentOptions', value)
      }
      case 'imageBed': {
        await this.validWithDto(ImageBedDto, value)
        return this.configs.patch('imageBed', value)
      }
      case 'mailOptions': {
        await this.validWithDto(MailOptionsDto, value)
        return this.configs.patch('mailOptions', value)
      }
      case 'seo': {
        await this.validWithDto(SEODto, value)
        return this.configs.patch('seo', value)
      }
      default: {
        throw new UnprocessableEntityException('设置不存在')
      }
    }
  }

  private async validWithDto<T>(dto: ClassType<T>, value: any) {
    const validModel = plainToClass(dto, value)
    const errors = await validate(validModel, this.validOptions)
    if (errors.length > 0) {
      const error = this.validate.createExceptionFactory()(errors as any[])
      throw error
    }
    return true
  }
}
