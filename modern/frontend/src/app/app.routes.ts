import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { List } from './pages/list/list';
import { Detail } from './pages/detail/detail';
import { Admin } from './pages/admin/admin';
import { Login } from './pages/login/login';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'catalog/:category', component: List },
  { path: 'model/:id', component: Detail },
  { path: 'admin', component: Admin },
  { path: '**', redirectTo: '' }
];
