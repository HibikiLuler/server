import { Module } from '@nestjs/common'
import { CommentsController } from 'src/shared/comments/comments.controller'
import { CommentsService } from 'src/shared/comments/comments.service'
import { PostsController } from 'src/shared/posts/posts.controller'
import { NotesController } from './notes/notes.controller'
import { NotesService } from './notes/notes.service'
import { PostsService } from 'src/shared/posts/posts.service'
import { TestModule } from './test/test.module';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';
import { MenuController } from './menu/menu.controller';
import { MenuService } from './menu/menu.service';

@Module({
  providers: [PostsService, NotesService, CommentsService, CategoriesService, MenuService],
  controllers: [NotesController, CommentsController, PostsController, CategoriesController, MenuController],
  imports: [TestModule],
})
export class SharedModule {}
