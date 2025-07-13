/*
 * Copyright 2024 BookMarkDown Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppProvider';
import { Layout } from './components/Layout/Layout';
import { WelcomePage } from './pages/WelcomePage';
import { BookmarksPage } from './pages/BookmarksPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { RootRedirect } from './components/Auth/RootRedirect';

export const App: React.FC = () => {
  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route element={<Layout />}>
            <Route
              path="/bookmarks"
              element={
                <ProtectedRoute>
                  <BookmarksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </div>
    </AppProvider>
  );
};