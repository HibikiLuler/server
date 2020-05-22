import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { FastifyReply } from 'fastify'
import { IncomingMessage, ServerResponse } from 'http'
import { RolesGuard } from 'src/auth/roles.guard'
import { Auth } from 'src/core/decorators/auth.decorator'
import { Master } from 'src/core/decorators/guest.decorator'
import { CannotFindException } from 'src/core/exceptions/cant-find.exception'
import { PermissionInterceptor } from 'src/core/interceptors/permission.interceptors'
import { IdDto } from 'src/shared/base/dto/id.dto'
import { SearchDto } from 'src/shared/base/dto/search.dto'
import {
  ListQueryDto,
  NidType,
  NoteDto,
  NoteQueryDto,
  PasswordQueryDto,
} from 'src/shared/notes/dto/note.dto'
import { addConditionToSeeHideContent, yearCondition } from 'src/shared/utils'
import { NotesService } from './notes.service'

@ApiTags('Note Routes')
@Controller('notes')
@UseInterceptors(PermissionInterceptor)
@UseGuards(RolesGuard)
export class NotesController {
  constructor(private readonly noteService: NotesService) {}

  @Get()
  @ApiOperation({ summary: '获取随记带分页器' })
  @Auth()
  async getNotes(@Master() isMaster: boolean, @Query() query: NoteQueryDto) {
    const { size, select, page, sortBy, sortOrder, year } = query
    const condition = {
      ...addConditionToSeeHideContent(isMaster),
      ...yearCondition(year),
    }
    return await this.noteService.findWithPaginator(condition, {
      limit: size,
      skip: (page - 1) * size,
      select,
      sort: sortBy ? { [sortBy]: sortOrder || -1 } : { created: -1 },
    })
  }

  @Get('latest')
  @ApiOperation({ summary: '获取最新发布一篇随记' })
  async getLatestOne(
    @Master() isMaster: boolean,
    @Headers('referer') referrer: string,
  ) {
    const { latest, next } = await this.noteService.getLatestOne(isMaster)
    await this.noteService.shouldAddReadCount(referrer, latest)
    return { data: latest.toObject(), next: next.toObject() }
  }

  @Get(':id')
  async getOneNote(
    @Param() params: IdDto,
    @Master() isMaster: boolean,
    @Query() query: PasswordQueryDto,
    @Headers('referer') referrer?: string,
  ) {
    const { id } = params
    const { password } = query
    const condition = addConditionToSeeHideContent(isMaster)
    const current = await this.noteService
      .findOne({
        _id: id,
        ...condition,
      })
      .select('+password')
    if (!current) {
      throw new CannotFindException()
    }
    if (
      !this.noteService.checkPasswordToAccess(current, password) &&
      !isMaster
    ) {
      throw new ForbiddenException('不要偷看人家的小心思啦~')
    }
    await this.noteService.shouldAddReadCount(referrer, current)
    const prev = await this.noteService
      .findOne({
        ...condition,
        created: {
          $gt: current.created,
        },
      })
      .sort({ created: 1 })
      .select('-text')
    const next = await this.noteService
      .findOne({
        ...condition,
        created: {
          $lt: current.created,
        },
      })
      .sort({ created: -1 })
      .select('-text')
    return { data: current, next, prev }
  }

  @Get('/list/:id')
  @ApiParam({ name: 'id', example: '5e6f71c5c052ca214fba877a', type: 'string' })
  @ApiOperation({ summary: '以一篇随记为基准的中间 10 篇随记' })
  async getNoteList(
    @Query() query: ListQueryDto,
    @Param() params: IdDto,
    @Master() isMaster: boolean,
  ) {
    const { size = 10 } = query
    const half = Math.floor(size / 2)
    const { id } = params
    const select = 'nid _id title created'
    const condition = addConditionToSeeHideContent(isMaster)
    const currentDocument = await this.noteService
      .findOne({
        _id: id,
        ...condition,
      })
      .select(select)
    if (!currentDocument) {
      throw new CannotFindException()
    }
    const prevList =
      half - 1 === 0
        ? []
        : await this.noteService.findAsync(
            {
              created: {
                $gt: currentDocument.created,
              },
              ...condition,
            },
            { limit: half - 1, sort: { created: -1 }, select },
          )
    const nextList = !half
      ? []
      : await this.noteService.findAsync(
          {
            created: {
              $lt: currentDocument.created,
            },
            ...condition,
          },
          { limit: half, sort: { created: -1 }, select },
        )
    const data = [...prevList, ...nextList, currentDocument].sort(
      (a: any, b: any) => b.created - a.created,
    )
    if (!data.length) {
      throw new CannotFindException()
    }
    return { data, size: data.length }
  }

  @Post()
  @Auth()
  async createNewNote(@Body() body: NoteDto) {
    const res = await this.noteService.createNew(body)
    return res
  }

  @Put(':id')
  @Auth()
  async modifyNote(@Body() body: NoteDto, @Param() params: IdDto) {
    const { id } = params
    return await this.noteService.update({ _id: id }, body)
  }

  @Get('like/:id')
  async likeNote(
    @Param() param: IdDto,
    @Req() req: FastifyReply<IncomingMessage> & { session: any },
    @Res() res: FastifyReply<ServerResponse>,
  ) {
    if (!req.session.liked) {
      req.session.liked = [param.id]
    } else {
      if ((req.session.liked as string[]).includes(param.id)) {
        return res
          .status(422)
          .header('Access-Control-Allow-Origin', req.headers['origin'])
          .header('Access-Control-Allow-Credentials', true)
          .send({ message: '一天一次就够啦' })
      }
      req.session.liked.push(param.id)
    }
    await this.noteService.likeNote(param.id)

    res
      .header('Access-Control-Allow-Origin', req.headers['origin'])
      .header('Access-Control-Allow-Credentials', true)
      .send('OK')
  }

  @Delete(':id')
  @Auth()
  async deleteNote(@Param() params: IdDto) {
    return await this.noteService.deleteByIdAsync(params.id)
  }

  @ApiOperation({ summary: '根据 nid 查找' })
  @Get('/nid/:nid')
  async getNoteByNid(
    @Param() params: NidType,
    @Master() isMaster: boolean,
    @Headers('referer') referrer: string,
    @Query() query: PasswordQueryDto,
  ) {
    const _id = await this.noteService.validNid(params.nid)
    return await this.getOneNote({ id: _id }, isMaster, query, referrer)
  }

  @ApiOperation({ summary: '根据 nid 修改' })
  @Put('/nid/:nid')
  @Auth()
  async modifyNoteByNid(@Param() params: NidType, @Body() body: NoteDto) {
    const _id = await this.noteService.validNid(params.nid)
    return await this.modifyNote(body, {
      id: _id,
    })
  }

  @ApiOperation({ summary: '搜索' })
  @Get('/search')
  async searchNote(@Query() query: SearchDto) {
    const { keyword, page, size } = query
    const select = '_id title created modified nid'
    const keywordArr = keyword
      .split(/\s+/)
      .map((item) => new RegExp(String(item), 'ig'))
    return await this.noteService.findWithPaginator(
      { $or: [{ title: { $in: keywordArr } }, { text: { $in: keywordArr } }] },
      {
        limit: size,
        skip: (page - 1) * size,
        select,
      },
    )
  }
}
