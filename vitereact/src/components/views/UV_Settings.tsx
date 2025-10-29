import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/main';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';