package sports.apparel.backend.features.users;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import sports.apparel.backend.entity.User;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    @Test
    void createUser_shouldStorePasswordForNonAdminUsersWhenProvided() {
        when(userRepository.existsByUsername("employee"))
                .thenReturn(false);
        when(userRepository.existsByEmail("employee@verdida.local"))
                .thenReturn(false);
        when(passwordEncoder.encode("StrongPass123!"))
                .thenReturn("encoded-password");
        when(userRepository.save(any(User.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CreateUserRequest request = new CreateUserRequest();
        request.setUsername("employee");
        request.setEmail("employee@verdida.local");
        request.setPassword("StrongPass123!");
        request.setRole("EMPLOYEE");

        userService.createUser(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertEquals("encoded-password", userCaptor.getValue().getPassword());
    }
}
