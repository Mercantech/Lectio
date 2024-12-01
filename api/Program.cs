using System.Text;
using api.Context;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace api
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            builder.Services.AddCors(options =>
            {
                options.AddPolicy(
                    "AllowLectioAndExtensions",
                    builder =>
                    {
                        builder
                            .SetIsOriginAllowed(
                                origin =>
                                    origin.StartsWith("chrome-extension://")
                                    || origin == "https://www.lectio.dk"
                            )
                            .AllowAnyMethod()
                            .AllowAnyHeader();
                    }
                );
            });

            // Konfigurer database connection
            string connectionString =
                builder.Configuration.GetConnectionString("DefaultConnection")
                ?? Environment.GetEnvironmentVariable("DefaultConnection");

            builder.Services.AddDbContext<LectioEnhancerDBContext>(
                options => options.UseNpgsql(connectionString)
            );

            // Hent JWT indstillinger fra konfiguration eller miljøvariabler
            var jwtKey =
                builder.Configuration["JwtSettings:Key"]
                ?? Environment.GetEnvironmentVariable("JWT_KEY");
            var jwtIssuer =
                builder.Configuration["JwtSettings:Issuer"]
                ?? Environment.GetEnvironmentVariable("JWT_ISSUER");
            var jwtAudience =
                builder.Configuration["JwtSettings:Audience"]
                ?? Environment.GetEnvironmentVariable("JWT_AUDIENCE");

            // Valider at nødvendige JWT indstillinger er tilgængelige
            if (
                string.IsNullOrEmpty(jwtKey)
                || string.IsNullOrEmpty(jwtIssuer)
                || string.IsNullOrEmpty(jwtAudience)
            )
            {
                throw new Exception(
                    "JWT konfiguration mangler. Sørg for at alle nødvendige JWT indstillinger er angivet."
                );
            }

            // Konfigurer JWT Authentication
            builder.Services
                .AddAuthentication(x =>
                {
                    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                    x.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
                })
                .AddJwtBearer(x =>
                {
                    x.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidIssuer = jwtIssuer,
                        ValidAudience = jwtAudience,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true
                    };
                });

            var app = builder.Build();

            app.UseSwagger();
            app.UseSwaggerUI();

            app.UseCors("AllowLectioAndExtensions");
            app.UseHttpsRedirection();
            app.UseAuthentication();
            app.UseAuthorization();
            app.MapControllers();

            app.Run();
        }
    }
}
